import { Ctx } from "../../lib/ctx";
//bnh

// Updated Send Command
module.exports = {
    name: "send",
    category: "General",
    code: async (ctx: Ctx) => {
        const args = ctx.args;

        // Check if the bot is muted
       

        if (args.length < 2) {
            await ctx.reply("Please provide a recipient JID and a message. Example: !send 2758967876@s.whatsapp.net Hello!");
            return;
        }

        const recipientJid = args[0];
        const message = args.slice(1).join(" ");

        // Validate the recipient JID
        if (!recipientJid.includes("@s.whatsapp.net")) {
            await ctx.reply("Invalid JID format. Please provide a valid WhatsApp JID. Example: 2758967876@s.whatsapp.net");
            return;
        }
   
        try {
          
            const fakeText = {
                key: {
                  fromMe: false,
                  participant: "13135550002@s.whatsapp.net",
                  remoteJid: "status@broadcast",
                },
                message: {
                  extendedTextMessage: {
                    text: `\u201CSent by ${ctx.sender?.pushName!}.\u201D`,
                    title: "Response",
                    thumbnailUrl: "https://beyyo-web.onrender.com/uploads/27678113720@s.whatsapp.net/R.jpg", // Replace with actual bot thumbnail URL
                  },
                },
              };
    
              await ctx.client.sendMessage(recipientJid, { text: message }, { quoted: fakeText });
            // Acknowledge the delivery to the sender
            await ctx.reply(`✅ Your message has been sent to ${recipientJid}:\n"${message}"`);

        } catch (error) {
            console.error('Error sending message:', error);
            await ctx.reply("⚠️ There was an error sending your message. Please try again later.");
        }
    }
};
