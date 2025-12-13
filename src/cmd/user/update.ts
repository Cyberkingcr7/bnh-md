import { db } from "../../db/DatabaseHandler";
import { Ctx } from "../../lib/ctx";

module.exports = {
  name: "update",
  aliases: [],
  category: "User",
  code: async (ctx: Ctx) => {
//    if (ctx.isGroup) {
//      await ctx.reply("\u2837h This command can only be used in private messages.")
//      return;
//    }

    const senderId = ctx?.message.key?.participant || ctx?.message.key?.remoteJid;
    const allowed = ["78683834449936@lid", "27672633675@s.whatsapp.net"];

    if (!senderId || !allowed.includes(senderId)) {
      await ctx.reply("\u2837h You are not authorized to use this command.");
      return;
    }

    try {
      const body =
        ctx.message.message?.conversation ||
        ctx.message.message?.extendedTextMessage?.text ||
        "";

      const args = body.trim().split(" ");
      if (args.length < 3) {
        await ctx.reply(
          "\u2837h Invalid usage.\n\n\u2837h Correct format:\n!update <OldNumber@s.whatsapp.net> <NewLid>\n\nExample:\n!update 27672633675@s.whatsapp.net 1234567890@lid"
        );
        return;
      }

      let oldJid = args[1];
      const newLid = args[2];

      // Ensure old number ends with @s.whatsapp.net
      if (!oldJid.endsWith("@s.whatsapp.net")) {
        if (/^\d{11,15}$/.test(oldJid)) {
          oldJid = oldJid + "@s.whatsapp.net";
        } else {
          await ctx.reply("\u2837h Invalid old JID. Enter like 27683655563@s.whatsapp.net");
          return;
        }
      }

      // Ensure new LID ends with @lid
      if (!newLid.endsWith("@lid")) {
        await ctx.reply("\u2837h Invalid new JID. Must end with @lid.");
        return;
      }

      const oldUserRef = db.collection("users").doc(oldJid);
      const oldUserDoc = await oldUserRef.get();

      if (!oldUserDoc.exists) {
        await ctx.reply("\u2837h No user found with that old JID.");
        return;
      }

      const oldData = oldUserDoc.data()!;
      const newUserRef = db.collection("users").doc(newLid);

      await newUserRef.set({
        ...oldData,
        lid: newLid,
        preUser: oldJid,
      });

      // Delete old record to prevent duplicates
    //  await oldUserRef.delete();

      await ctx.reply(
        `\u2837h User updated!\n\n\u2837h Old JID: *${oldJid}*\n\u2837h New LID: *${newLid}*`
      );
    } catch (error) {
      console.error("Error in update command:", error);
      await ctx.reply("\u2837h An error occurred while updating. Please try again later.");
    }
  },
};

