import { Ctx } from "../../lib/ctx";
import { checkAdmin, ensureAuthenticated } from '../../lib/utils';
import { DatabaseHandler } from '../../db/DatabaseHandler';
//bnh

const dbHandler = new DatabaseHandler();

module.exports = {
  name: "demote",
  category: "Admin",
  code: async (ctx: Ctx): Promise<void> => {
 
    const userId = ctx.sender?.jid!;

    // Ensure the user is registered
    const userDocSnapshot = await dbHandler.getUser(userId);
   // if (!userDocSnapshot.exists) {
    //  return void ctx.reply("🟥 *User not found. Please write !register*");
    //}

    // Check if the sender is an admin
    const senderJid = ctx.sender?.jid!;
    const isAdmin = await checkAdmin(ctx, senderJid);
    if (!isAdmin) {
      await ctx.reply("You do not have permission to use this command.");
      return;
    }

    // Determine the target user(s) to demote
    let targets: string[] = [];

    // Check if a user is quoted in the message
    if (ctx.quoted) {
      const quotedParticipant = ctx.message.message?.extendedTextMessage?.contextInfo?.participant;
      console.log("Quoted Participant ID:", quotedParticipant);
      if (quotedParticipant) {
        targets.push(quotedParticipant);
      }
    }

    // Check if any user is mentioned in the message
    const mentioned = ctx.getMentioned();
    if (mentioned && mentioned.length > 0) {
      targets.push(...mentioned);
    }

    if (targets.length === 0) {
      await ctx.reply("Please specify a user to demote by quoting or mentioning them.");
      return;
    }

    try {
      // Demote the targets in the group
      await ctx.group()!.demote(targets);
      await ctx.reply(`Successfully demoted: ${targets.join(", ")}`);
    } catch (error) {
      console.error('Error handling demote command:', error);
      await ctx.reply('An error occurred while trying to demote users.');
    }
  }
};
