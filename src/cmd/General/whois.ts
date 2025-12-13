import { Ctx } from "../../lib/ctx";
import { db } from "../../db/DatabaseHandler";

module.exports = {
    name: "lookup",
    aliases: [ "whois"],
    category: "Admin",
    code: async (ctx:Ctx) => {
        try {
            const input = ctx.args[0];

            if (!input) {
                await ctx.reply("Please provide a valid number to lookup. Example: `.lookup 1234567890`");
                return;
            }

            const formattedJid = `${input}@s.whatsapp.net`;

            // Fetch user doc by the JID
            const userDoc = await db.collection('users').doc(formattedJid).get();

            if (!userDoc.exists) {
                await ctx.reply(`No user found for number: ${input}`);
                return;
            }

            const userData = userDoc.data();

            await ctx.reply(
                `🔍 *User Lookup Result*\n\n` +
                `👤 *Name:* ${userData?.firstName}\n` +
                `🔢 *Number:* ${input}\n` +
                `🎂 *Age:* ${userData?.age}\n` +
                `🟢 *Logged In:* ${userData?.loggedIn ? "Yes" : "No"}`
            );
        } catch (error) {
            console.error("Error during user lookup:", error);
            await ctx.reply("An error occurred while trying to find the user. Please try again.");
        }
    },
}
