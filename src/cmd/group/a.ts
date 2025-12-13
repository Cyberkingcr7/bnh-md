
import { DatabaseHandler } from '../../db/DatabaseHandler'; // Assuming this is the same as in the gamble command
import { Ctx } from '../../lib/ctx';
import { checkAdmin } from "../../lib/utils";
//bnh

const dbHandler = new DatabaseHandler();

module.exports = {
  name: "antilink",
  aliases: ['a'],
  category: "Admin",
  code: async (ctx: Ctx) => {
    try {

        const groupId = ctx.message?.key?.remoteJid!;
        if (!groupId) {
          await ctx.reply("Failed to retrieve group ID.");
          return;
        }

        const senderJid = ctx.sender?.jid!;
        if (!senderJid) {
          await ctx.reply("Failed to retrieve your ID. Please write !register");
          return;
        }

        // Check if the sender is an admin
        const isAdmin = await checkAdmin(ctx, senderJid);
        if (!isAdmin) {
          await ctx.reply("You do not have permission to use this command.");
          return;
        }

        // Parse command arguments
        const args = ctx.args;
        if (args.length === 0) {
          await ctx.reply("Please specify `--on` to enable or `--off` to disable the anti-link feature.");
          return;
        }

        const option = args[0].toLowerCase();
        if (option === 'on') {
          await dbHandler.setAntilink(groupId, true);
          await ctx.reply("Anti-link feature has been enabled for this group.");
        } else if (option === 'off') {
          await dbHandler.setAntilink(groupId, false);
          await ctx.reply("Anti-link feature has been disabled for this group.");
        } else {
          await ctx.reply("Invalid option. Use `on` to enable or `off` to disable.");
        }
      
    } catch (error) {
      console.error('Error:', error);
      await ctx.reply("Sorry, there was an error processing your request.");
    }
  }}
