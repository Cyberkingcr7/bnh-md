import { Ctx } from "../../lib/ctx";
import { checkAdmin } from '../../lib/utils';
import { DatabaseHandler } from '../../db/DatabaseHandler';

const dbHandler = new DatabaseHandler();

module.exports = {
  name: "close",
  category: "Admin",
  code: async (ctx: Ctx): Promise<void> => {
    const userId = ctx.sender?.jid!;
    const groupId = ctx.id; // current group

    // check if sender is admin
    const isAdmin = await checkAdmin(ctx, userId);
    if (!isAdmin) {
      await ctx.reply("⚠️ You do not have permission to use this command.");
      return;
    }

    try {
      // close the group — ONLY ADMINS CAN SEND
      await ctx.sock.groupSettingUpdate(groupId, 'announcement');

      await ctx.reply("✅ The group has been closed. Only admins can send messages now.");
    } catch (error) {
      console.error("❌ Error closing group:", error);
      await ctx.reply("⚠️ An error occurred while trying to close the group.");
    }
  }
};

