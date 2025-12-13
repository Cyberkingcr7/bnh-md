import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import { makeWASocket, proto } from 'baileys';
import fs from "fs";
import path from "path";
import didYouMean from "didyoumean";
import { WASocket } from 'baileys';
import { Ctx } from "./ctx";
import { dbHandler } from "../db/DatabaseHandler";
import { tryProcessWcgInline } from "../cmd/games/wcg";

export interface Command {
  name: string;
  aliases?: string | string[];
  category?: string;
  code: (ctx: Ctx) => Promise<void>;
}

//start

export class CommandHandler {
  private bot: WASocket;
  private commandsPath: string;
  private commands: Map<string, Command> = new Map();

  constructor(bot: WASocket, commandsPath: string) {
    this.bot = bot;
    this.commandsPath = commandsPath;
  }

  private async readCommandsDir(dirPath: string) {
    const files = await fs.promises.readdir(dirPath);
    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      const stat = await fs.promises.stat(fullPath);

      if (stat.isDirectory()) {
        await this.readCommandsDir(fullPath);
      } else if (file.endsWith(".js") || file.endsWith(".ts")) {
        await this.loadCommand(fullPath);
      }
    }
  }

  private async loadCommand(commandPath: string) {
    const commandModule = await import(commandPath);
    const command: Command = commandModule.default || commandModule;

    if (!command.name || !command.code) {
      console.warn(`Skipping command file ${commandPath} because it lacks a name or code.`);
      return;
    }

    this.commands.set(command.name.toLowerCase(), command);

    if (command.aliases) {
      const aliases = Array.isArray(command.aliases) ? command.aliases : [command.aliases];
      aliases.forEach((alias) => this.commands.set(alias.toLowerCase(), command));
    }
  }

  async load() {
    await this.readCommandsDir(this.commandsPath);
    console.log(`[CommandHandler] Loaded ${this.commands.size} commands.`);
  }

  async handle(ctx: Ctx) {
    const prefix = "!";
    if (!ctx.body.startsWith(prefix)) return;

    const args = ctx.body.slice(prefix.length).trim().split(/ +/);
    const cmdName = args.shift()?.toLowerCase();
    if (!cmdName) return;

    const command = this.commands.get(cmdName);
    if (!command) {
      // Fallback: try word-chain inline answer (so users can just send !<word>)
      const handled = await tryProcessWcgInline(ctx, [cmdName, ...args]);
      if (handled) return;

      const knownCommands = Array.from(this.commands.keys());
      const suggestion = didYouMean(cmdName, knownCommands);
      if (suggestion && suggestion !== cmdName) {
        await ctx.reply(`Did you mean *${prefix}${suggestion}*?`);
      }
      return;
    }

    try {
      // Inject unique commands (no duplicate aliases)
      const uniqueCommands = Array.from(
        new Map([...this.commands.values()].map((cmd) => [cmd.name, cmd])).values()
      );
      ctx.commands = uniqueCommands;

      // Patch reply methods to detect if output was sent
      (ctx as any)._replied = false;
      const wrapFn = (fn: any) => async (...args: any[]) => {
        (ctx as any)._replied = true;
        return fn(...args);
      };

      ctx.reply = wrapFn(ctx.reply);
      if (ctx.sendImage) ctx.sendImage = wrapFn(ctx.sendImage);
      if (ctx.react) ctx.react = wrapFn(ctx.react);
      await command.code(ctx);

      // Award XP for using a command (only if command executed successfully)
      const userId = ctx.sender?.jid;
      if (userId) {
        try {
          // Award random XP between 5-15 for each command
          await dbHandler.setXp(userId, 5, 15);
        } catch (xpError) {
          // Silently fail XP awarding - don't break command execution
          console.error('Error awarding XP:', xpError);
        }
      }

      // Optional: Log if command ran silently
      if (!(ctx as any)._replied) {
        console.warn(`⚠️ Command "${cmdName}" executed without sending any reply.`);
      }

    } catch (err) {
      console.error(`Error executing command "${cmdName}":`, err);
      await ctx.reply("⚠️ There was an error while executing this command.");
    }
  }
}
