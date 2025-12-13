import { DatabaseHandler } from "../../db/DatabaseHandler";
import { Ctx } from "../../lib/ctx";
import mime from 'mime-types';
import { getStats, ranks } from "../../lib/stats";

const dbHandler = new DatabaseHandler();

// Lazy load canvacord to avoid canvas initialization errors at startup
let canvacord: any = null;
async function getCanvacord() {
  if (!canvacord) {
    try {
      const canvacordModule = await import("canvacord");
      // Handle both default and named exports
      canvacord = canvacordModule.default || canvacordModule;
    } catch (error) {
      console.error('Failed to load canvacord:', error);
      throw new Error('Canvas module is not available. Please install Windows Build Tools or rebuild canvas.');
    }
  }
  return canvacord;
}

module.exports = {
  name: "rank",
  category: "User",
  code: async (ctx: Ctx) => {
    const userId = ctx.sender?.jid;
    if (!userId) {
      console.error("User ID is undefined");
      return ctx.reply("🟥 *User not found.*");
    }


    let target = null;

    // Determine target user: quoted message, mentioned JIDs, or default to self
    if (ctx.quoted) {
      const quotedParticipant = ctx.message.message?.extendedTextMessage?.contextInfo?.participant;
      if (quotedParticipant) target = quotedParticipant;
    }
    if (!target) {
      const mentionedJids = ctx.getMentioned();
      if (mentionedJids && mentionedJids.length > 0) target = mentionedJids[0];
    }
    if (!target) target = userId;

    // Get profile picture URL, with fallback
    let profileUrl: string;
    try {
      profileUrl = await ctx.client.profilePictureUrl(target, "image") || "https://i.ibb.co/3Fh9V6p/avatar-contact.png";
    } catch {
      profileUrl = "https://i.ibb.co/3Fh9V6p/avatar-contact.png";
    }

    try {
      // Try to load canvacord
      const canvacordModule = await getCanvacord();
      
      // Fetch user data and rank stats
      const userProfile = await dbHandler.getUser(target!);
      const userData = userProfile.data();
      const experience = userData?.Xp || 0;

      // Get username for the target user. Use the `target` JID or `ctx.sender?.pushName` for the current user
      const username = target === userId ? ctx.sender?.pushName || "Unknown" : target.split("@")[0];

      // Numeric rank (for canvacord) could be set to `level` or any other number.
      
      const { level, requiredXpToLevelUp, rank, currentXpInLevel } = getStats(experience);

      const rankCard = new canvacordModule.Rank()
        .setAvatar(profileUrl)
        .setCurrentXP(currentXpInLevel) // Ensure this reflects current progress in the level
        .setRequiredXP(requiredXpToLevelUp) // This should represent XP required for the next level
        .setStatus("online")
        .setProgressBar("#FFFFFF", "COLOR")
        .setUsername(username)
        .setLevel(level)
        .setDiscriminator('0000', "#FF0000")
        .setRank(level); // The rank might also need adjustment, check if it's calculated as expected
      
      const buffer = await rankCard.build(); // Build the rank card
      
      await ctx.reply({
        image: buffer,
        mimetype: mime.contentType("png") || "image/png",
        caption: `🏮 *Username:* ${username}\n\n🌟 *Experience:* ${currentXpInLevel} / ${requiredXpToLevelUp}\n\n🥇 *Rank:* ${rank}\n\n🍀 *Level:* ${level}`
      });
      

    } catch (error: any) {
      console.error('Error retrieving or sending rank card:', error);
      if (error.message && error.message.includes('Canvas module')) {
        return ctx.reply('❌ *Canvas module error*\n\nCanvas is not properly installed. The rank card feature requires canvas to be built correctly.\n\nTo fix this, run:\n`npm rebuild canvas`\n\nOr install Windows Build Tools:\n`npm install --global windows-build-tools`');
      }
      return ctx.reply('An error occurred while retrieving the rank.');
    }
  },
};
