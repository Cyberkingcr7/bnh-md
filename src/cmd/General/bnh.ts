import { DatabaseHandler } from "../../db/DatabaseHandler";
import { Ctx } from "../../lib/ctx";

;

const dbHandler = new DatabaseHandler();

module.exports = {
  name: "bnh",
  aliases: "owner",
  category: "General",
  code: async (ctx: Ctx) => {
  

      await ctx.reply(`Root user: 27678113720\nLynx :27672633675`);

    
  },
};
