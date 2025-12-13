import { Ctx } from "../../lib/ctx";
import { checkAdmin } from "../../lib/utils";

module.exports = {
    name: "tagall",
    category: "Admin",
    code: async (ctx: Ctx) => {
        // Check if the bot is muted
    
        const senderJid = ctx.sender?.jid;
        if (!senderJid) {
            await ctx.reply("Failed to retrieve sender information.");
            return;
        }

        // Check if user is an admin
        const isAdmin = await checkAdmin(ctx, senderJid);
        if (!isAdmin) {
            await ctx.reply("You do not have permission to use this command.");
            return;
        }

        try {
            const members = await ctx.group()?.members()!;
            const mentions = members.map(member => `@${member.id.split("@")[0]}`); // gayer

            const message = mentions.join("\n"); // gay

            return await ctx.reply({
                text: message,
                mentions: members.map(member => member.id) 
            });
        } catch (error: any) {
            console.error(`Error:`, error);
            return await ctx.reply(`❎ An error occurred: ${error.message}`);
        }
    }
};