
import path from 'path';
import { DatabaseHandler } from "../../db/DatabaseHandler";
import { Ctx } from "../../lib/ctx";
import fs from 'fs'

const dbHandler = new DatabaseHandler();

export interface Command {
  name: string;
  aliases?: string | string[];
  category?: string;
}


let botStartTime = Date.now();

module.exports = {
    name: "menu",
    category: "General",
    code: async (ctx: Ctx) => {
        if (!ctx.id) {
            return ctx.reply("Failed to retrieve user ID.");
        }

        const filePath = path.join(__dirname, '../../../image.jpg');
        const left = fs.readFileSync(filePath);

        const uptime = Date.now() - botStartTime;
        const uptimeSeconds = Math.floor(uptime / 1000);
        const uptimeMinutes = Math.floor(uptimeSeconds / 60);
        const uptimeHours = Math.floor(uptimeMinutes / 60);
        const uptimeFormatted = `${uptimeHours} hours, ${uptimeMinutes % 60} minutes, ${uptimeSeconds % 60} seconds`;

         const allCommands = ctx.commands ?? [];
    const categories = allCommands.reduce((acc, cmd) => {
        const category = cmd.category || 'General';
        if (!acc[category]) acc[category] = [];
        acc[category].push(cmd);
        return acc;
    }, {} as { [key: string]: Command[] });

        let bodyText = `*Konnichiwa! I'm the BNH bot!!*\n`;
        bodyText += `*The usable commands are listed below.*\n\n`;

        Object.keys(categories).forEach((category) => {
            bodyText += `*━━━❰ ${category} ❱━━━*\n\n`;
            const commandNames = categories[category].map((cmd) => cmd.name).join(" , ");
            bodyText += `${commandNames}\n\n`;
        });

        bodyText += ` ────────────────────\n`;
        bodyText += `│- ᴜꜱᴇʀ: *${ctx?.sender?.pushName}*\n`;
        bodyText += `│- ɴᴀᴍᴇ: BNH\n`;
        bodyText += `│- ᴘʀᴇꜰɪx: !\n`;
        bodyText += `│- Uptime: ${uptimeFormatted}\n`;
        bodyText += `╰────────────────────\n`;

        await ctx.reply({
            image: left, // Directly pass the buffer here
            caption: bodyText,
        });
    }}
