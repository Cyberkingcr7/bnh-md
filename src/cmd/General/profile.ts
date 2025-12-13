import { DatabaseHandler } from "../../db/DatabaseHandler"; // Adjust the path if needed
import mime from 'mime-types'; // Make sure to install the 'mime-types' package
import {  getStats, ranks } from "../../lib/stats";
import fs from 'fs'; // Make sure fs is imported for reading files
import path from "path";
import f from 'fs/promises'
import axios from "axios";
import { Ctx } from "../../lib/ctx";
import { StatusData } from 'baileys';

const dbHandler = new DatabaseHandler();


async function ensureDownloadDirectory() {
  const downloadDir = path.join(process.cwd(), 'downloads');
  try {
      await f.mkdir(downloadDir, { recursive: true });
      console.log(`Download directory confirmed: ${downloadDir}`);
  } catch (error) {
      console.error('Error creating download directory:', error);
  }
  return downloadDir;
}

// Helper function to download a file using axios
async function downloadFile(url: string, destination: string) {
  const writer = fs.createWriteStream(destination);
  const response = await axios.get(url, {
      responseType: 'stream',
      timeout: 400000,
  });
  response.data.pipe(writer);
  await new Promise<void>((resolve, reject) => {
      writer.on('finish', () => resolve());
      writer.on('error', reject);
  });
}

module.exports = {
  name: "profile",
  aliases: 'p',
  category: "User",
  code: async (ctx: Ctx) => {

      const userId = ctx.sender?.jid;

      if (!userId) {
          console.error("User ID is undefined");
          return ctx.reply("🟥 *User not found.*");
      }

      let target = null;

      // Check if there is a quoted message
      if (ctx.quoted) {
          const quotedParticipant = ctx.message.message?.extendedTextMessage?.contextInfo?.participant;
          if (quotedParticipant) {
              target = quotedParticipant;
          }
      }

      if (!target) {
          const mentionedJids = ctx.getMentioned();
          if (mentionedJids && mentionedJids.length > 0) {
              target = mentionedJids[0];
          }
      }

      if (!target) {
          target = userId;
      }

      let profileUrl: string;

      try {
          const userProfile = await dbHandler.getUser(target!);
          const userData = userProfile.data();
          const profilePicUrlFromDb = userData?.profilePicture;

          if (profilePicUrlFromDb) {
              profileUrl = profilePicUrlFromDb;
          } else {
              profileUrl = await ctx.client.profilePictureUrl(target, "image") || "https://i.ibb.co/3Fh9V6p/avatar-contact.png";
          }

          console.log("Fetched profile picture URL:", profileUrl);
      } catch (error:any) {
          console.error("Error fetching profile picture URL:", error.message);
          profileUrl = "https://i.ibb.co/3Fh9V6p/avatar-contact.png";
      }

      try {
          const userProfile = await dbHandler.getUser(target!);
          const userData = userProfile.data();
       
          let experience = userData?.Xp || 0; // User's experience points
          
          // Use the getStats function to calculate the user's stats
          const { level, requiredXpToLevelUp, rank } = getStats( experience);
          
          // Get username
          const username = target === userId ? ctx.sender?.pushName || "Unknown" : target.split("@")[0];
          
          // Fetch bio or fallback
          let bio = userData?.bio || '';
          if (!bio) {
              try {
         
const statusData = await ctx.client.fetchStatus(target);

const userStatus = statusData?.[0]?.status as StatusData | undefined;

const bio = userStatus?.status || 'No bio available';

              } catch (error) {
                  console.error('Error fetching WhatsApp bio:', error);
                  bio = 'No bio available';
              }
          }
          
          const mimeType = mime.contentType("png") || "image/png";
          console.log("Sending reply with profile picture URL:", profileUrl);
          
          // Claimed cards and caught Pokémon
          const claimedCards = userData?.claimedCards || [];
          const caughtPokemons = userData?.caughtPokemons || [];
          
          // Construct the profile message
          const profileMessage = 
              `🌟 *Username:* ${username}\n\n` +
              `📝 *Bio:* ${bio}\n\n` + 
              `⭐ *Experience:* ${experience} XP\n\n` +
              `🏅 *Level:* Level ${level}\n\n` +
              `🔸 *Rank:* ${rank}\n\n` +

          if (profileUrl.endsWith(".mp4")) {
              const downloadDir = await ensureDownloadDirectory();
              const filePath = path.join(downloadDir, 'profile_video.mp4');
              await downloadFile(profileUrl, filePath); // Download the video

              await ctx.reply({
                  video: await f.readFile(filePath),
                  caption: profileMessage,
                  gifPlayback: true
              });
          } else {
              await ctx.reply({
                  image: { url: profileUrl },
                  mimetype: mimeType,
                  caption: profileMessage,
              });
          }

      } catch (error) {

          console.error('Error retrieving user profile:', error);
          return ctx.reply('An error occurred while retrieving the profile.');
      }
  },
};
