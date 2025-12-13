import { Ctx } from "../../lib/ctx";


module.exports = {
    name: "link",
    aliases: ["gclink", "grouplink"],
    category: "Admin",
    code: async (ctx:Ctx) => {

        try {
            const code = await ctx.group()?.inviteCode();
            return await ctx.reply(`https://chat.whatsapp.com/${code}`);
        } catch (error:any)
         {
            console.error(` Error:`, error);
            return await ctx.reply(`⚠️  ${error.message}`);
        }
    }
};
