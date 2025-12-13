import { Ctx } from "../../lib/ctx";
import { checkAdmin } from '../../lib/utils';
import { DatabaseHandler } from '../../db/DatabaseHandler';

const dbHandler = new DatabaseHandler();

module.exports = {
  name: "open",
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
      // open the group — everyone can send messages
      await ctx.sock.groupSettingUpdate(groupId, 'not_announcement');

      await ctx.reply("✅ The group has been opened. Everyone can now send messages.");
    } catch (error) {
      console.error("❌ Error opening group:", error);
      await ctx.reply("⚠️ An error occurred while trying to open the group.");
    }
  }
};

