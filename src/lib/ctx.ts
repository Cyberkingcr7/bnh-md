import {
  WASocket,
  proto,
  downloadContentFromMessage,
  MediaType,
  AnyMessageContent,
  GroupParticipant,
  ParticipantAction,
  GroupMetadata,
  BinaryNode,
} from 'baileys';
import { DownloadableMessage } from 'baileys';
import { Command } from "./cmdhandler";
import { db } from "../db/DatabaseHandler";

export class CtxWrapper {
    public raw: any;       // The original ctx
    public message: proto.IWebMessageInfo;
    public quoted?: proto.IWebMessageInfo;
    public sender?: { jid: string; pushName?: string };
    public id?: string;
    public args: string[];

    constructor(ctx: any) {
        this.raw = ctx;
        this.message = ctx.message?.message ?? ctx.message;
        this.quoted = ctx.message?.extendedTextMessage?.contextInfo?.quotedMessage ?? ctx.quoted;
        this.sender = ctx.sender;
        this.id = ctx.id;
        this.args = ctx.args || [];
    }

    /**
     * Returns the WAMessage for Baileys
     */
    getBaileysMessage(): proto.IWebMessageInfo {
        return this.message;
    }

    /**
     * Returns the quoted message, properly wrapped
     */
    getQuotedMessage(): proto.IWebMessageInfo | undefined {
        return this.quoted;
    }

    /**
     * Returns the media type: image, video, audio, document, sticker
     */
    getMediaType(): "image" | "video" | "audio" | "document" | "sticker" | undefined {
        if (!this.quoted) return undefined;
        const types = ["imageMessage", "videoMessage", "audioMessage", "documentMessage", "stickerMessage"];
        for (const t of types) {
            if ((this.quoted as any)[t]) return t.replace("Message", "") as any;
        }
        return undefined;
    }

    /**
     * Download the media buffer from the quoted message
     */
    async downloadQuotedMedia(): Promise<Buffer | undefined> {
        const mediaType = this.getMediaType();
        if (!mediaType || !this.quoted) return undefined;

        const msgToDownload: any = {
            key: this.raw.message.key, // Use the original key
            message: this.quoted,
        };

        const stream = await downloadContentFromMessage(msgToDownload, mediaType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        return buffer;
    }
}


// 🔹 Context Interface
export interface Ctx {
  sock: WASocket;
  client: WASocket;
  message: proto.IWebMessageInfo;
  id: string;
  args: string[];
  body: string;
  isGroup: boolean;
  groupId?: string;
  getMentioned: () => string[] | null | undefined;
  quoted?: Ctx;
commands?: Command[];
  sender: {
    jid: string;
    pushName?: string;
    participantAlt?: string;

  };

  reply: (textOrMsg: string | AnyMessageContent) => Promise<any>;
  sendImage: (buffer: Buffer, caption?: string) => Promise<any>;
  getMessageType: () => string;
  downloadMedia: () => Promise<Buffer | null>;
  react: (emoji: string) => Promise<void>;
  read: () => Promise<void>;
  simulateTyping: () => Promise<void>;

  media: {
    toBuffer: () => Promise<Buffer | null>;
    toStream: () => ReturnType<typeof downloadContentFromMessage> | null;
  };

  group: () => ReturnType<typeof createGroupUtils> | null;

}

// 🔹 Type Guard for media downloadability
function isDownloadableMessage(content: any): content is DownloadableMessage {
  return content && typeof content === "object" && ("url" in content || "directPath" in content);
}

// 🔹 Group Utility
function createGroupUtils(ctx: Ctx) {
  const { sock, groupId } = ctx;
  if (!groupId) return null;

  const getMetadata = async () => await sock.groupMetadata(groupId);

return {
  id: groupId,
  members: async (): Promise<GroupParticipant[]> => (await getMetadata()).participants,

  inviteCode: async () => await sock.groupInviteCode(groupId),
  revokeInviteCode: async () => await sock.groupRevokeInvite(groupId),
  leave: async () => await sock.groupLeave(groupId),
  membersCanAddMemberMode: async (mode: "on" | "off") =>
    await sock.groupSettingUpdate(groupId, mode === "on" ? "unlocked" : "locked"),
  metadata: getMetadata,
  getMetadata: async (key: keyof GroupMetadata) => (await getMetadata())[key],
  name: async () => (await getMetadata()).subject,
  description: async () => (await getMetadata()).desc,
  owner: async () => (await getMetadata()).owner,
  isAdmin: async (jid: string) => {
    const participants = (await getMetadata()).participants;
    const participant = participants.find(p => p.id === jid);
    return participant?.admin !== undefined;
  },
  isSenderAdmin: async () => {
    const participants = (await getMetadata()).participants;
    const participant = participants.find(p => p.id === ctx.sender.jid);
    return participant?.admin !== undefined;
  },
  isBotAdmin: async () => {
    const botJid = sock.user?.id;
    const participants = (await getMetadata()).participants;
    const participant = participants.find(p => p.id === botJid);
    return participant?.admin !== undefined;
  },
  updateDescription: async (description: string) =>
    await sock.groupUpdateDescription(groupId, description),
  updateSubject: async (subject: string) =>
    await sock.groupUpdateSubject(groupId, subject),
  membersUpdate: async (members: string[], action: ParticipantAction) =>
    await sock.groupParticipantsUpdate(groupId, members, action),
  kick: async (members: string[]) =>
    await sock.groupParticipantsUpdate(groupId, members, "remove"),
  add: async (members: string[]) =>
    await sock.groupParticipantsUpdate(groupId, members, "add"),
  promote: async (members: string[]) =>
    await sock.groupParticipantsUpdate(groupId, members, "promote"),
  demote: async (members: string[]) =>
    await sock.groupParticipantsUpdate(groupId, members, "demote"),
  updateSetting: async (setting: "announcement" | "not_announcement" | "locked" | "unlocked") =>
    await sock.groupSettingUpdate(groupId, setting),
  open: async () => await sock.groupSettingUpdate(groupId, "unlocked"),

  close: async () => await sock.groupSettingUpdate(groupId, "locked"),
  lock: async () => await sock.groupSettingUpdate(groupId, "announcement"),
  unlock: async () => await sock.groupSettingUpdate(groupId, "not_announcement"),
};

}

export async function createCtx(sock: WASocket, msg: proto.IWebMessageInfo): Promise<Ctx> {
  const pushName = msg.pushName ?? undefined;
  const remoteJid = msg?.key?.remoteJid;
  const participantAlt = (msg as any)?.key?.participantAlt;
  const participant = participantAlt ?? msg?.key?.participant;
  
  // Ensure originalJid is always a valid string
  // In DMs: remoteJid is the user's JID, participant is undefined
  // In groups: remoteJid is the group JID, participant is the user's JID
  let originalJid = (participant || remoteJid || "").trim();
  if (!originalJid) {
    // Log the error but don't throw - use a fallback instead
    console.error("Warning: Invalid message - missing remoteJid and participant", {
      remoteJid,
      participant,
      key: msg?.key
    });
    // Use a fallback JID to prevent crashes
    originalJid = (remoteJid || participant || "unknown@s.whatsapp.net").trim() || "unknown@s.whatsapp.net";
  }
  
const isGroup = typeof remoteJid === "string" && remoteJid.endsWith("@g.us");
const groupId = isGroup ? remoteJid : undefined;

let userData: any = null;
if (originalJid && typeof originalJid === "string" && originalJid.trim() !== "") {
  const userDoc = await db.collection("users").doc(originalJid).get().catch(() => null);
  userData = userDoc && userDoc.exists ? userDoc.data() : null;
}

  // Determine effective acting JID
  const actingJid: string = (userData?.actingAs && typeof userData.actingAs === "string" && userData.actingAs.trim() !== "") 
    ? userData.actingAs.trim() 
    : originalJid;

  // If acting as someone else, fetch their user data for pushName
  let actingPushName = pushName;
  if (actingJid !== originalJid && actingJid && typeof actingJid === "string" && actingJid.trim() !== "") {
    const actingDoc = await db.collection("users").doc(actingJid).get().catch(() => null);
    if (actingDoc && actingDoc.exists) {
      actingPushName = actingDoc.data()?.firstName || actingPushName;
    }
  }

  const sender = {
    jid: actingJid,
    pushName: actingPushName,
    participantAlt: participantAlt,
  };

 
  const messageContent = msg.message || {};
  const body =
    messageContent.conversation ||
    messageContent.extendedTextMessage?.text ||
    messageContent.imageMessage?.caption ||
    messageContent.videoMessage?.caption ||
    "";

  const allArgs = body.trim().split(/\s+/);
  const command = allArgs[0];
  const args = allArgs.slice(1);

  const getMessageType = () => Object.keys(msg.message || {})[0];

  const downloadMedia = async () => {
    const messageType = getMessageType() as keyof proto.IMessage;
    const content = msg.message?.[messageType];
    if (!content || !isDownloadableMessage(content)) return null;

    try {
      const stream = await downloadContentFromMessage(content, messageType as MediaType);
      const buffer: Uint8Array[] = [];
      for await (const chunk of stream) buffer.push(chunk);
      return Buffer.concat(buffer);
    } catch (e) {
      console.error("Failed to download media:", e);
      return null;
    }
  };

  const getMedia = () => {
    const messageType = getMessageType() as keyof proto.IMessage;
    const content = msg.message?.[messageType];
    if (!content || !isDownloadableMessage(content)) {
      return {
        toBuffer: async () => null,
        toStream: () => null,
      };
    }

    return {
      toBuffer: async () => {
        try {
          const stream = await downloadContentFromMessage(content, messageType as MediaType);
          const buffer: Uint8Array[] = [];
          for await (const chunk of stream) buffer.push(chunk);
          return Buffer.concat(buffer);
        } catch (e) {
          console.error("Failed to download buffer:", e);
          return null;
        }
      },
      toStream: () => {
        try {
          return downloadContentFromMessage(content, messageType as MediaType);
        } catch (e) {
          console.error("Failed to get stream:", e);
          return null;
        }
      },
    };
  };

  const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const stanzaId = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
  const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;

  const quotedCtx: Ctx | undefined =
    quotedMsg && stanzaId && (msg?.key?.remoteJid || quotedParticipant)
      ? await createCtx(sock, {
          key: {
            remoteJid: msg?.key?.remoteJid || quotedParticipant || "",
            fromMe: false,
            id: stanzaId,
            participant: quotedParticipant ?? undefined,
          },
          message: quotedMsg,
        }).catch(() => undefined)
      : undefined;


  const returnedCtx: Ctx = {
    sock,
    client: sock,
    message: msg,
    sender,
    id: msg?.key?.remoteJid || "",
    args,
    body,
    isGroup,
    groupId,
    getMessageType,
    downloadMedia,
    media: getMedia(),
    quoted: quotedCtx,

    reply: async (textOrMsg: string | AnyMessageContent) => {
      const content = typeof textOrMsg === "string" ? { text: textOrMsg } : textOrMsg;
      return sock.sendMessage(msg?.key?.remoteJid!, content);
    },

    sendImage: async (buffer: Buffer, caption = "") => {
      return sock.sendMessage(msg?.key?.remoteJid!, { image: buffer, caption });
    },

    react: async (emoji: string) => {
      await sock.sendMessage(msg?.key?.remoteJid!, { react: { text: emoji, key: msg.key } });
    },

    read: async () => sock.readMessages([msg?.key!]),

    simulateTyping: async () => sock.sendPresenceUpdate("composing", msg?.key?.remoteJid!),

    getMentioned: () => {
      return msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
    },

    group: () => createGroupUtils(returnedCtx),
  };

  return returnedCtx;
}
