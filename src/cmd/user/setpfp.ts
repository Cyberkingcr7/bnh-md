import { downloadContentFromMessage } from 'baileys';
import { Ctx } from "../../lib/ctx";
import { db } from "../../db/DatabaseHandler";
import axios from "axios";
import FormData from "form-data";

// Function to generate a random file name
const generateRandomFileName = (extension: string) => {
  const randomString = Math.random().toString(36).substring(2, 15);
  return `${randomString}.${extension}`;
};

// Function to handle file uploads
const uploadFile = async (userId: string, buffer: Buffer, fileName: string) => {
  const formData = new FormData();
  formData.append("user_id", userId);
  formData.append("file[]", buffer, { filename: fileName });

  const response = await axios.post("http://127.0.0.1:1234/upld", formData, {
    headers: { ...formData.getHeaders() },
  });

  const data = response.data;

  if (data.success) {
    const uploadedFile = data.uploaded_files[0];
    return {
      url: uploadedFile.url,
    };
  } else {
    throw new Error("Upload failed: No URL returned.");
  }
};

// Helper: download media from a quoted message
const getBufferFromQuoted = async (ctx: Ctx): Promise<{ buffer: Buffer; fileName: string } | null> => {
  const quoted = ctx.message?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (!quoted) return null;

  let mediaMsg: any = null;
  let fileName = "";

  if (quoted.imageMessage) {
    mediaMsg = quoted.imageMessage;
    fileName = generateRandomFileName("jpeg");
  } else if (quoted.videoMessage) {
    mediaMsg = quoted.videoMessage;
    fileName = generateRandomFileName("mp4");
  } else if (quoted.stickerMessage) {
    mediaMsg = quoted.stickerMessage;
    fileName = generateRandomFileName("png");
  }

  if (!mediaMsg) return null;

  const stream = await downloadContentFromMessage(mediaMsg, quoted.imageMessage ? "image" : quoted.videoMessage ? "video" : "sticker");

  let buffer = Buffer.from([]);
  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk]);
  }

  return { buffer, fileName };
};

// Main function for setpfp command
module.exports = {
  name: "setpfp",
  aliases: ["setprofilepic", "setavatar"],
  category: "User",
  code: async (ctx: Ctx) => {
    try {
      const userId = ctx.sender?.jid;
      if (!userId) {
        await ctx.reply("⚠️ Failed to retrieve your user ID.");
        return;
      }

      const mediaData = await getBufferFromQuoted(ctx);
      if (!mediaData) {
        await ctx.reply("⚠️ Please quote an image, video, or sticker to set as your profile picture.");
        return;
      }

      const uploadedUrl = await uploadFile(userId, mediaData.buffer, mediaData.fileName);

      await db.collection("users").doc(userId).update({
        profilePicture: uploadedUrl.url,
      });

      await ctx.reply(`✅ Successfully set your profile picture!`);
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      await ctx.reply("⚠️ An error occurred while uploading your profile picture. Please try again.");
    }
  },
};

