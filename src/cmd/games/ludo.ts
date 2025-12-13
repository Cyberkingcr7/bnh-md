import { Ctx } from "../../lib/ctx";
import axios from "axios";

const API_BASE = "http://localhost:3001"; // Ensure this matches the server port

// Function to send board to the user
const sendBoard = async (ctx: Ctx, message: string, rolledNumber?: number) => {
    try {
        const response = await axios.get(`${API_BASE}/board`, { responseType: "arraybuffer" });
        const boardImage = Buffer.from(response.data, "binary");

        // Reply with the board image and message
        await ctx.reply({
            image: boardImage,
            caption: `${message}${rolledNumber ? ` You rolled a ${rolledNumber}.` : ""}`,
        });
    } catch (error) {
        console.error("Error fetching board image:", error);
        ctx.reply("❌ Unable to fetch the board.");
    }
};

module.exports = {
    name: "ludo",
    category: "Games",
    code: async (ctx: Ctx) => {
        const userId = ctx.sender?.jid!;
        const userName = ctx.sender?.pushName || "Player";
        const command = ctx.args[0];

        try {
            switch (command) {
                case "join":
                    const joinResponse = await axios.post(`${API_BASE}/join`, { id: userId, name: userName });
                    ctx.reply(joinResponse.data.message);
                    break;

                case "start":
                    const startResponse = await axios.post(`${API_BASE}/start`);
                    ctx.reply(startResponse.data.message);
                    break;

                case "roll":
                    const rollResponse = await axios.post(`${API_BASE}/roll`, { id: userId });
                    const rolledNumber = rollResponse.data.rolledNumber;
                    const rollMessage = rollResponse.data.message;

                    // Send the updated board with the roll result
                    await sendBoard(ctx, rollMessage, rolledNumber);

                    ctx.reply(`${rollMessage} Next player is ${rollResponse.data.nextPlayer}.`);
                    break;

                case "move":
                    const pieceNumber = parseInt(ctx.args[1], 10);

                    if (!pieceNumber || pieceNumber < 1 || pieceNumber > 4) {
                        return ctx.reply("❌ Please provide a valid piece number (1-4).");
                    }

                    // Send the move request with piece number
                    const moveResponse = await axios.post(`${API_BASE}/move`, { id: userId, pieceNumber });
                    const { message, nextPlayer } = moveResponse.data;

                    // Send the updated board after the move
                    await sendBoard(ctx, message);

                    ctx.reply(`${message} Next player is ${nextPlayer}.`);
                    break;

                case "end":
                    const endResponse = await axios.post(`${API_BASE}/end`);
                    ctx.reply(endResponse.data.message);
                    break;

                default:
                    ctx.reply("Invalid command. Use !ludo join, !ludo start, !ludo roll, !ludo move <pieceNumber>, or !ludo end.");
                    break;
            }
        } catch (error: any) {
            console.error("Error handling Ludo command:", error);
            ctx.reply(`❌ ${error.response?.data?.message || "An error occurred."}`);
        }
    },
};
