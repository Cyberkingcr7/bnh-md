
import { DatabaseHandler } from '../../db/DatabaseHandler';
import { checkAdmin, ensureAuthenticated } from "../../lib/utils";
//bnh
import { Ctx } from '../../lib/ctx';

const dbHandler = new DatabaseHandler();

module.exports = {
  name: "welcome",
  category: "Admin",
  code: async (ctx: Ctx) => {
    try {
      const userId = ctx.sender?.jid!;
      
      if (!ctx.isGroup) {
        await ctx.reply("This command can only be used in groups.");
        return;
      }

      const groupId = ctx.message?.key?.remoteJid!;
      if (!groupId) {
        await ctx.reply("Failed to retrieve group ID.");
        return;
      }

      const isAdmin = await checkAdmin(ctx, userId);
      if (!isAdmin) {
        await ctx.reply("You do not have permission to use this command.");
        return;
      }

      const args = ctx.args;
      if (args.length === 0) {
        await ctx.reply("Please specify `on` to enable or `off` to disable the welcome message feature.");
        return;
      }

      const option = args[0].toLowerCase();

      if (option === 'on') {
        await dbHandler.setWelcome(groupId, true);
        console.log(`Enabled welcome message for group ${groupId}`);

        // Wait for a brief period before checking the value from DB
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1-second delay

        const welcomeEnabled = await dbHandler.getWelcome(groupId);
        console.log(`Welcome setting after delay for group ${groupId}: ${welcomeEnabled}`);

        await ctx.reply("Welcome message feature has been enabled for this group.");
      } else if (option === 'off') {
        await dbHandler.setWelcome(groupId, false);
        console.log(`Disabled welcome message for group ${groupId}`);

        // Wait for a brief period before checking the value from DB
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1-second delay

        const welcomeEnabled = await dbHandler.getWelcome(groupId);
        console.log(`Welcome setting after delay for group ${groupId}: ${welcomeEnabled}`);

        await ctx.reply("Welcome message feature has been disabled for this group.");
      } else {
        await ctx.reply("Invalid option. Use `on` to enable or `off` to disable.");
      }
    } catch (error) {
      console.error('Error:', error);
      await ctx.reply("Sorry, there was an error processing your request.");
    }
  }
}
