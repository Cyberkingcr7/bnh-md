import { Ctx } from "../../lib/ctx";
import { S_WHATSAPP_NET } from 'baileys';
import { checkAdmin } from "../../lib/utils";
//bnh


module.exports = {
    name: "hidetag",
    aliases: ["ht"],
    category: "Admin",
    code: async (ctx:Ctx) => {

        const input = ctx.args.join(" ") || "@everyone";
        const senderJid = ctx?.sender?.jid!;
        const isAdmin = await checkAdmin(ctx, senderJid);
        if (!isAdmin) {
            await ctx.reply("You do not have permission to use this command.");
            return;
        }
     try {
            const members = await ctx.group()?.members()!;
            const mentions = members.map((member: { id: string; }) => member.id.split(/[:@]/)[0] + S_WHATSAPP_NET);

            return await ctx.reply({
                text: input,
                mentions
            });
        } catch (error:any) {
            console.error(` Error:`, error);
            return await ctx.reply(`❎ Terjadi kesalahan: ${error.message}`);
        }
    }
};