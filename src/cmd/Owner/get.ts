import { DatabaseHandler } from "../../db/DatabaseHandler";
import { Ctx } from "../../lib/ctx";

const dbHandler = new DatabaseHandler();

module.exports = {
  name: "get",
  category: "Owner",
  code: async (ctx: Ctx) => {
    const userId = ctx.sender?.jid!;
    const allowedJIDs = [
      '20216595640437@lid',
      '78683834449936@lid'
    ];

    if (!allowedJIDs.includes(userId)) {
      await ctx.reply("❌ You do not have permission to use this command.");
      return;
    }

    // Extract group JID from message
    const input = ctx.body?.trim().split(/\s+/)[1]; // !get <groupJid>
    const groupJid = input?.trim();
    if (!groupJid) {
      await ctx.reply("❌ Please provide a group JID.\n");
      return;
    }

    try {
      // Fetch invite code
      const inviteCode = await ctx.client.groupInviteCode(groupJid);
      const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;

      // Send invite link
      const sentMsg = await ctx.reply(`✅ Group link: ${inviteLink}`);

      // Delete message after 1 minute
      setTimeout(async () => {
        try {
          await ctx.client.sendMessage(ctx.id, { delete: sentMsg.key });
        } catch (err) {
          console.error("Failed to delete message:", err);
        }
      }, 60_000);

    } catch (err: any) {
      console.error("Error fetching group link:", err);
      await ctx.reply("❌ Failed to fetch the group link. Make sure the bot is in the group and is an admin.");
    }
  },
};

