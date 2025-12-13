import { Ctx } from "../../lib/ctx";
import { db } from '../../db/DatabaseHandler';
import os from 'os'; // Import the 'os' module to get system information
import * as path from 'path';
import * as fs from 'fs/promises';
let botStartTime = Date.now();

module.exports = {
  name: "uptime",
  category: "General",
  code: async (ctx: Ctx) => {
    const userId = ctx.sender?.jid!;
    const messageContext = ctx?.message!;
    const id = messageContext?.key?.remoteJid || '';

    if (!userId) {
      return ctx.reply("🟥 *User not found. Please write !register*");
    }

    try {
      // Calculate uptime
      const uptime = Date.now() - botStartTime;
      const uptimeSeconds = Math.floor(uptime / 1000);
      const uptimeMinutes = Math.floor(uptimeSeconds / 60);
      const uptimeHours = Math.floor(uptimeMinutes / 60);
      const uptimeFormatted = `${uptimeHours} hours, ${uptimeMinutes % 60} minutes, ${uptimeSeconds % 60} seconds`;

      // Get user count from Firestore
      const userCountSnapshot = await db.collection('users').get();
      const userCount = userCountSnapshot.size;

      // Get group count
      const groupData = await ctx.client.groupFetchAllParticipating();
      const groupCount = Object.keys(groupData).length;

      // Get RAM usage
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const usedMemoryMB = (usedMemory / (1024 * 1024)).toFixed(2);
      const totalMemoryMB = (totalMemory / (1024 * 1024)).toFixed(2);

      // Get total unique commands (excluding aliases)
const commandsDir = path.resolve(__dirname, './../'); // Adjust if needed

async function getCommandFiles(dirPath: string): Promise<string[]> {
    let commandFiles: string[] = [];

    const files: string[] = await fs.readdir(dirPath);
    for (const file of files) {
        const fullPath = path.join(dirPath, file);
        const stat = await fs.stat(fullPath);

        if (stat.isDirectory()) {
            const nestedFiles: string[] = await getCommandFiles(fullPath);
            commandFiles = commandFiles.concat(nestedFiles);
        } else if (file.endsWith('.js') || file.endsWith('.ts')) {
            commandFiles.push(fullPath);
        }
    }

    return commandFiles;
}

const commandFiles: string[] = await getCommandFiles(commandsDir);
const totalCommands: number = commandFiles.length;

      // Send uptime and status info
      ctx.reply(`*━━❰ Uptime Status ❱━━* 
Uptime: ${uptimeFormatted} 
Users: ${userCount} 
Groups: ${groupCount} 
Commands: ${totalCommands} 
RAM: ${usedMemoryMB} MB / ${totalMemoryMB} MB`);
    } catch (error) {
      console.error('Error fetching uptime:', error);
      ctx.reply('An error occurred while fetching uptime data.');
    }
  },
};
