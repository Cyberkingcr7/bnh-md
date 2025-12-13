import { Ctx } from "../../lib/ctx";
import { checkAdmin } from '../../lib/utils';
import { DatabaseHandler } from '../../db/DatabaseHandler';

const dbHandler = new DatabaseHandler();

module.exports = {
  name: "promote",
  aliases: ['crown'],
  category: "Admin",
  code: async (ctx: Ctx): Promise<void> => {
    const userId = ctx.sender?.jid!;
    const senderJid = ctx.sender?.jid!;

    // Ensure the user is registered
    const userDocSnapshot = await dbHandler.getUser(userId);
    //if (!userDocSnapshot.exists) {
    //  return void ctx.reply("🟥 *User not found. Please write !register*");
    //}

    // Check if sender is admin
    const isAdmin = await checkAdmin(ctx, senderJid);
    if (!isAdmin) {
      await ctx.reply("You do not have permission to use this command.");
      return;
    }

    // Determine target user(s)
    let targets: string[] = [];

    // If quoting a message, extract participant
    if (ctx.quoted) {
      const quotedParticipant = ctx.message.message?.extendedTextMessage?.contextInfo?.participant;
      if (quotedParticipant) {
        targets.push(quotedParticipant);
      }
    }

    // If users are mentioned
    const mentioned = ctx.getMentioned();
    if (mentioned && mentioned.length > 0) {
      targets.push(...mentioned);
    }

    if (targets.length === 0) {
      await ctx.reply("Please specify a user to promote by quoting or mentioning them.");
      return;
    }

    try {
      // Promote the users
      await ctx.group()!.promote(targets);

     await ctx.reply(`Successfully crowned: ${targets.join(", ")}`);
    } catch (error) {
      console.error('Error handling  command:', error);
      await ctx.reply('An error occurred while trying to crown users.');
  }}
};
