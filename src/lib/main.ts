import 'module-alias/register';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  proto,
  WASocket,
  ConnectionState,
} from 'baileys';
import Boom from '@hapi/boom';
import pino from 'pino';
import { CommandHandler } from './cmdhandler';
import { tryProcessWcgPassive } from '../cmd/games/wcg';
import { createCtx, Ctx } from './ctx';
import * as path from 'path';
import { dbHandler } from '../db/DatabaseHandler';
import { exec } from 'child_process';
import axios from 'axios';
import fs from 'fs';
import { readFile, unlink, writeFile, rm } from 'fs/promises';
import { checkAdmin } from './utils';
import qrcodeTerminal from 'qrcode-terminal';
import qrcode from 'qrcode';
import express from 'express';
import util from 'util';

let sockInstance: ReturnType<typeof makeWASocket> | null = null;
const logger = pino({ level: 'silent' });
const app = express();
const PORT = process.env.PORT || 8080;
let latestQR: string | null = null;

// Export socket instance
export function getSock() {
  if (!sockInstance) throw new Error('Socket not initialized yet');
  return sockInstance;
}

// Ensure a clean auth state
async function safeAuthState(authPath: string) {
  const credsFile = path.join(authPath, 'creds.json');
  try {
    const content = await readFile(credsFile, 'utf8');
    const json = JSON.parse(content);
    if (!json || (!json.noiseKey && !json.clientID)) throw new Error('Invalid creds');
    console.log('Valid WhatsApp session found at', credsFile);
  } catch {
    console.log('No valid session found. Removing old auth files at', authPath);
    await rm(authPath, { recursive: true, force: true });
  }
  return await useMultiFileAuthState(authPath);
}

// Ensure download directory
async function ensureSrcDirectory() {
  const downloadDir = path.join(process.cwd(), 'src');
  try {
    await fs.promises.mkdir(downloadDir, { recursive: true });
    console.log(`Download directory confirmed: ${downloadDir}`);
  } catch (err) {
    console.error('Error creating directory:', err);
  }
  return downloadDir;
}

export async function bot() {
  const { state, saveCreds } = await safeAuthState('state');
  const sock = makeWASocket({ logger, auth: state });
  sockInstance = sock;
  sock.ev.on('creds.update', saveCreds);

  // Command handler
  const commandsPath = path.resolve(__dirname, '../cmd');
  let cmdHandler: CommandHandler | undefined;
  if (fs.existsSync(commandsPath)) {
    cmdHandler = new CommandHandler(sock, commandsPath);
    cmdHandler.load();
  }

  const BOT_JID = '93745225175@s.whatsapp.net';
  const linkRegex = /(https?:\/\/[^\s]+|chat\.whatsapp\.com\/[A-Za-z0-9]+|t\.me\/[^\s]+)/i;

  async function isBotGroupAdmin(sock: WASocket, groupJid: string): Promise<boolean> {
    try {
      const metadata = await sock.groupMetadata(groupJid);
      const bot = metadata.participants.find(p => p.id === BOT_JID);
      return bot?.admin === 'admin' || bot?.admin === 'superadmin';
    } catch (err) {
      console.error('Failed to get group metadata:', err);
      return false;
    }
  }

  // Message handling
  sock.ev.on('messages.upsert', async (event) => {
    const { messages, type } = event;
    if (type !== 'notify') return;

    const msg = messages[0];
    const keyParticipant = (msg.key as any).participantAlt ?? msg.key.participant;

    if (!msg.message || msg.key.fromMe) return;
    const chatId = msg.key.remoteJid ?? keyParticipant ?? '';
    if (!chatId) return;

    let ctx: Ctx;
    try {
      ctx = await createCtx(sock, msg);
    } catch (error) {
      console.error('Error creating context:', error);
      return;
    }

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption ||
      msg.message.videoMessage?.caption ||
      '';

    const groupId = msg.key.remoteJid ?? chatId;

    let senderJid: string | undefined;
    if (msg.key.remoteJid?.endsWith("@g.us")) senderJid = msg.key.participant || undefined;
    else {
      if (msg.key.remoteJid?.endsWith("@lid")) senderJid = msg.key.remoteJid;
      else if (msg.key.remoteJidAlt?.endsWith("@lid")) senderJid = msg.key.remoteJidAlt;
    }
    if (!senderJid || !senderJid.endsWith("@lid")) return;

    ctx.sender.jid = senderJid;
    ctx.sender.participantAlt = senderJid;
    const senderName = msg.pushName || senderJid;
    console.log(`[${ctx.sender.jid}] says: ${text}`);

    if (text.toLowerCase().startsWith('!') && cmdHandler) {
      await cmdHandler.handle(ctx);
      return;
    }

    if (await tryProcessWcgPassive(ctx, text)) return;
    if (text === '!') {
      await ctx.reply('wagwan');
      return;
    }

    if (text.startsWith('>')) {
      try {
        const senderId = keyParticipant || msg.key.remoteJid;
        if (!senderId) {
          await ctx.reply('Failed to retrieve your ID.');
          return;
        }
        const userDoc = await dbHandler.getUser(senderId);
        if (!userDoc.exists) {
          await ctx.reply('You are not registered in the system.');
          return;
        }
        const userRole = userDoc.data()?.role ?? '';
        if (!['superuser', 'poweruser'].includes(userRole)) {
          await ctx.reply('You do not have permission to use this command.');
          return;
        }

        const commandText = text.slice(1).trim();
        if (!commandText) {
          await ctx.reply("Please provide a command after '>'.");
          return;
        }

        if (commandText.startsWith('edit:')) {
          const newContent = commandText.slice(5).trim();
          if (!newContent) {
            await ctx.reply('Please provide content to replace the file.');
            return;
          }
          const downloadDir = await ensureSrcDirectory();
          const fileName = path.join(downloadDir, 'cmd.txt');
          await fs.promises.writeFile(fileName, newContent, 'utf8');
          await ctx.reply(`File 'cmd.txt' has been successfully updated.`);
        } else if (commandText.startsWith('js:')) {
          const jsCode = commandText.slice(3).trim();
          if (!jsCode) {
            await ctx.reply('No valid JavaScript code provided.');
            return;
          }
          try {
            const evaled = await eval(jsCode);
            await ctx.reply(`Result: ${util.inspect(evaled, { depth: 0 })}`);
          } catch (err: any) {
            await ctx.reply(`JavaScript Error: ${err.message}`);
          }
        } else {
          exec(commandText, async (error, stdout, stderr) => {
            const response = error ? `Error: ${stderr || error.message}` : `Output: ${stdout}`;
            await ctx.reply(response);
          });
        }
      } catch (err) {
        console.error(err);
        await ctx.reply('Error processing your request.');
      }
    }

    // Auto-join group
    const TARGET_GROUP = '120363386725048071@g.us';
    const MIN_MEMBERS = 30;
    const inviteLinkRegex = /https:\/\/chat\.whatsapp\.com\/([A-Za-z0-9]+)/;
    if (groupId === TARGET_GROUP) {
      const match = text.match(inviteLinkRegex);
      if (match) {
        const inviteCode = match[1];
        try {
          const joinedGroupJid = await sock.groupAcceptInvite(inviteCode);
          if (!joinedGroupJid) return;
          console.log(`Joined group ${joinedGroupJid}`);
          await sock.sendMessage(groupId, { text: `Successfully joined group ${joinedGroupJid}` });
          const metadata = await sock.groupMetadata(joinedGroupJid);
          const memberCount = metadata.participants.length;
          if (memberCount < MIN_MEMBERS) {
            await sock.groupLeave(joinedGroupJid);
            await sock.sendMessage(groupId, { text: `Group ${metadata.subject} has only ${memberCount} members, left.` });
          }
        } catch (err) {
          console.error('Error joining group:', err);
          await sock.sendMessage(groupId, { text: 'Failed to join group.' });
        }
      }
    }

    // Anti-link
    if (groupId.endsWith('@g.us') && linkRegex.test(text)) {
      const antilinkEnabled = await dbHandler.getAntilink(groupId);
      if (!antilinkEnabled) return;
      const isSenderAdmin = await checkAdmin(await ctx, senderJid);
      const isBotAdmin = await isBotGroupAdmin(sock, groupId);
      if (!isBotAdmin) return;
      if (isSenderAdmin) return;
      try {
        await sock.groupParticipantsUpdate(groupId, [senderJid], 'remove');
        await sock.sendMessage(groupId, { text: `${senderName} was removed for sending a link.` });
      } catch (err) {
        console.error('Failed to kick user:', err);
      }
    }
  });

  // Connection handling & QR
  sock.ev.on('connection.update', (update: Partial<ConnectionState>) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      latestQR = qr;
      qrcodeTerminal.generate(qr, { small: true });
      console.log('QR code available at /qr');
    }

    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error &&
        Boom.isBoom(lastDisconnect.error) &&
        lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) bot();
    } else if (connection === 'open') {
      console.log('Connected to WhatsApp!');
    }
  });

  // QR endpoint
  app.get('/qr', async (req, res) => {
    if (!latestQR) return res.status(404).send('No QR code available yet');
    try {
      const dataUrl = await qrcode.toDataURL(latestQR);
      const img = Buffer.from(dataUrl.split(',')[1], 'base64');
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': img.length,
      });
      res.end(img);
    } catch (err) {
      res.status(500).send('Failed to generate QR');
    }
  });

  app.listen(PORT, () => console.log(`QR server running at http://localhost:${PORT}/qr`));

  return sock;
};

// GIF to MP4 helper
export const gifToMp4 = async (gif: Buffer, downloadDir: string): Promise<Buffer> => {
  const filename = `${downloadDir}/${Math.random().toString(36).substring(2, 10)}`;
  await writeFile(`${filename}.gif`, gif);
  await new Promise<void>((resolve, reject) => {
    exec(
      `ffmpeg -f gif -i ${filename}.gif -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" ${filename}.mp4`,
      (error) => (error ? reject(error) : resolve())
    );
  });
  const buffer = await readFile(`${filename}.mp4`);
  await Promise.all([unlink(`${filename}.gif`), unlink(`${filename}.mp4`)]);
  return buffer;
};

// Reaction helper
export const performReactionAction = async (reaction: string, message: string, ctx: Ctx) => {
  try {
    const waifuApiUrl = `https://api.waifu.pics/sfw/${reaction}`;
    const { data } = await axios.get(waifuApiUrl);
    if (!data.url) throw new Error('No valid media URL');
    const response = await axios.get(data.url, { responseType: 'arraybuffer' });
    const mp4Buffer = await gifToMp4(Buffer.from(response.data), 'downloads');
    await ctx.reply({ video: mp4Buffer, caption: message, gifPlayback: true, mimetype: 'video/mp4' });
  } catch (err: any) {
    console.error('Reaction error:', err.message);
    await ctx.reply('Failed to fetch or send the media.');
  }
};

export const reactions = {
  cry: ['Cried with', 'is Crying by'],
  kiss: ['Kissed'],
  bully: ['Bullied'],
  hug: ['Hugged'],
  lick: ['Licked'],
  cuddle: ['Cuddled with'],
  pat: ['Patted'],
  smug: ['Smugged at', 'is Smugging by'],
  highfive: ['High-fived'],
  bonk: ['Bonked'],
  yeet: ['Yeeted'],
  blush: ['Blushed at', 'is Blushing by'],
  wave: ['Waved at'],
  smile: ['Smiled at', 'is Smiling by'],
  handhold: ['is Holding Hands with'],
  nom: ['is Eating with', 'is Eating by'],
  bite: ['Bit'],
  glomp: ['Glomped'],
  kill: ['Killed'],
  slap: ['Slapped'],
  cringe: ['Cringed at'],
  kick: ['Kicked'],
  wink: ['Winked at'],
  happy: ['is Happy with', 'is Happy by'],
  poke: ['Poked'],
  dance: ['is Dancing with', 'is Dancing by'],
};
