import { Ctx } from "../../lib/ctx";
//bnh

// New Request Command
module.exports = {
    name: "request",
    category: "General",
    code: async (ctx: Ctx) => {
        const userId = ctx.sender?.jid!;
        const input = ctx.args.join(" ");

        if (!input) {
            await ctx.reply("Please provide a message for your request. Example: !request Add a new feature");
            return;
        }

        try {
            const adminJids = [
                "27678113720@s.whatsapp.net", // Admin 1
                "27672633675@s.whatsapp.net"   // Admin 2 (replace with the second number)
            ];
            const senderName = ctx.sender?.pushName || "Unknown User";

            // Send the request to both admins
            for (const adminJid of adminJids) {
                await ctx.client.sendMessage(adminJid, {
                    text: `*New Request Received*\n\nFrom: ${senderName} (${userId})\nMessage: ${input}`
                });
            }

            // Acknowledge the request to the user
            await ctx.reply("✅ Your request has been sent successfully.");

        } catch (error) {
            console.error('Error sending request:', error);
            await ctx.reply("⚠️ There was an error sending your request. Please try again later.");
        }
    }
};
