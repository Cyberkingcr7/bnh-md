import { db } from "../../db/DatabaseHandler";
import { Ctx } from "../../lib/ctx";
import bcrypt from "bcrypt";

// Helper: generate random strong password
function generateRandomPassword(length = 10): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$!";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

module.exports = {
  name: "register",
  aliases: ["reg"],
  category: "User",
  code: async (ctx: Ctx) => {
    const userId = ctx?.sender?.jid;
    if (!userId) {
      await ctx.reply("\u274C Error: Unable to fetch user ID."); // ❌
      return;
    }

    try {
      // Check if the user is already registered
      const userDoc = await db.collection("users").doc(userId).get();
      if (userDoc.exists) {
        await ctx.reply(
          "\u26A0\uFE0F You are already registered.\nIf you forgot your details, visit: https://space2bnhz.tail9ef80b.ts.net/"
        );
        return;
      }

      // Parse input
      const body =
        ctx.message.message?.conversation ||
        ctx.message.message?.extendedTextMessage?.text ||
        "";

      const args = body.split(" ");
      if (args.length < 2) {
        await ctx.reply(
          "\u274C Invalid usage.\n\n\u2705 Correct format:\n!register FirstName.SecondName.Age\n\nExample:\n!register John.Doe.25"
        );
        return;
      }

      const details = args[1].split(".");
      if (details.length < 3) {
        await ctx.reply(
          "\u274C Invalid format.\n\n\u2705 Use:\n!register FirstName.SecondName.Age"
        );
        return;
      }

      const firstName = details[0];
      const secondName = details[1];
      const age = parseInt(details[2], 10);

      if (!firstName || !secondName || isNaN(age) || age <= 0) {
        await ctx.reply(
          "\u274C Invalid details. Please use:\n!register FirstName.SecondName.Age"
        );
        return;
      }

      // Determine password
      let rawPassword: string;

      if (ctx.isGroup) {
        // Group registration: auto-generate password
        rawPassword = generateRandomPassword(10);

        // Send DM with password
        try {
          await ctx.client.sendMessage(userId, {
            text: `\u2705 *Registration Successful!*\n\n👤 *Name:* ${firstName} ${secondName}\n🎂 *Age:* ${age}\n🔑 *Password:* ${rawPassword}\n\n📌 Keep this password safe!`,
          });
        } catch {
          await ctx.reply(
            "\u26A0\uFE0F Could not send you a private message. Please start a chat with the bot and try again."
          );
          return;
        }
      } else {
        // Private registration: expect password in input
        const more = details.slice(3);
        if (more.length < 1) {
          await ctx.reply(
            "\u274C Missing password.\nUse: !register First.Second.Age.Password"
          );
          return;
        }
        rawPassword = more.join(".");
      }

      // Validate password (only for private reg)
      if (!ctx.isGroup && (rawPassword.length < 6 || !/[A-Z]/.test(rawPassword))) {
        await ctx.reply(
          "\u274C Password must be at least 6 characters long and contain at least one capital letter."
        );
        return;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(rawPassword, 10);

      // Save to Firestore
      await db.collection("users").doc(userId).set({
        firstName,
        secondName,
        password: hashedPassword,
        age,
        loggedIn: true,
      });

      if (ctx.isGroup) {
        // Group feedback
        await ctx.reply(
          `\u2705 *${firstName} ${secondName}* has been registered!\n🔐 Password has been sent to your private chat.`
        );
      } else {
        // Private feedback
        await ctx.reply(
          `\u2705 Registration complete!\n\n👤 Name: *${firstName} ${secondName}*\n🎂 Age: *${age}*\n🔑 Password: *${rawPassword}*\n\n🗝️ Keep your password safe!\n🔗 https://space2bnhz.tail9ef80b.ts.net/`
        );
      }
    } catch (error) {
      console.error("Error in register command:", error);
      await ctx.reply("\u26A0\uFE0F An error occurred during registration. Please try again later.");
    }
  },
};
