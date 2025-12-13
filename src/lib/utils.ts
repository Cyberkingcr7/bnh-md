import axios from "axios";
import { DatabaseHandler, db } from "../db/DatabaseHandler";
import { bot,  } from "./main";
import Cfont from 'cfonts'
import * as admin from 'firebase-admin';
import path from "path";
import f from "fs/promises";
import fs from 'fs'
import FormData from "form-data";
import { Ctx ,createCtx} from "./ctx";
import { proto } from 'baileys';


const dbHandler = new DatabaseHandler();

// Function to handle document sending
export async function sendDocument(ctx: Ctx, fileUrl: string, customFileName: string) {
    try { 
      const response = await axios.get(fileUrl, {
        responseType: 'arraybuffer' // Ensure response is treated as binary data
      });
  
      await ctx.reply({
        document: response.data,
        fileName: customFileName,
        mimetype: response.headers['content-type']
      });
      console.log(`Filename: ${customFileName}`);
      console.log(`MIME Type: ${response.headers['content-type']}`);
    } catch (error) {
      const errorMessage = `Failed to send document: ${(error as Error).message}`;
      console.error(errorMessage);
      ctx.reply(errorMessage);
    }
  }

export async function fetchImageWithRetry(url: string, retries: number = 3, delay: number = 1000): Promise<Buffer | undefined> {
    let attempts = 0;
    while (attempts < retries) {
        try {
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            return Buffer.from(response.data, 'binary');
        } catch (error:any) {
            attempts++;
            console.error(`Attempt ${attempts} failed to fetch image: ${error.message}`);
            if (attempts >= retries) {
                throw new Error(`Failed to fetch image after ${retries} attempts`);
            }
            console.log(`Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay)); // Wait before retrying
        }
    }
}



export async function isAuthenticatedUser(userId: string): Promise<boolean> {
  try {
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return false; // User doesn't exist
    }

    const userData = userDoc.data();
    
    return userData?.password !== undefined; // Check if password is present
  } catch (error) {
    console.error('Error checking user authentication:', error);
    return false; // Return false if an error occurs
  }
}
// Reaction map
export const reactionMap = {
  cry: "Cried with",
  kiss: "Kissed",
  bully: "Bullied",
  hug: "Hugged",
  lick: "Licked",
  cuddle: "Cuddled with",
  pat: "Patted",
  smug: "Smugged at",
  highfive: "High-fived",
  bonk: "Bonked",
  yeet: "Yeeted",
  blush: "Blushed at",
  wave: "Waved at",
  smile: "Smiled at",
  handhold: "Held hands with",
  nom: "Is Eating with",
  bite: "Bit",
  glomp: "Glomped",
  kill: "Killed",
  slap: "Slapped",
  cringe: "Cringed at",
  kick: "Kicked",
  wink: "Winked at",
  happy: "Is Happy with",
  poke: "Poked",
  dance: "Is Dancing with"
};

// Function to ensure the download directory exists
export async function ensureDownloadDirectory() {
  const downloadDir = path.join(process.cwd(), 'downloads');
  try {
      await fs.promises.mkdir(downloadDir, { recursive: true });
      console.log(`Download directory confirmed: ${downloadDir}`);
  } catch (error) {
      console.error('Error creating download directory:', error);
  }
  return downloadDir;
}


export const uploadToImgBB = async (imageBuffer:any) => {
  const apiKey = 'c65dc3f85a25f6eb503545941716c4f9';
  const form = new FormData();
  form.append('image', imageBuffer, 'image.png');
  form.append('key', apiKey);

  try {
      const response = await axios.post('https://api.imgbb.com/1/upload', form, {
          headers: {
              ...form.getHeaders(),
          },
      });
      return response.data.data.url;
  } catch (error:any) {
      console.error('Error uploading image:', error.response?.data || error.message);
      throw new Error('Failed to upload image');
  }
};

// Check NSFW classification using the provided API
export async function checkNSFW(imageUrl: string): Promise<any> {
  try {
      const apiUrl = `https://coderx-api.onrender.com/v1/tools/coderx/nsfwcheck?url=${encodeURIComponent(imageUrl)}`;
      const response = await axios.get(apiUrl);

      if (response.data && response.data.status) {
          return response.data; // Return the API response
      } else {
          throw new Error("NSFW classification failed.");
      }
  } catch (error: any) {
      console.error("Error checking NSFW content:", error.message || error);
      throw new Error("NSFW check failed.");
  }
}

// Delete the temporary image file after 2 minutes
export async function deleteTempImage(filePath: string) {
  setTimeout(async () => {
      try {
          await f.unlink(filePath);
          console.log(`Temporary image deleted: ${filePath}`);
      } catch (error) {
          console.error(`Error deleting temporary image: ${filePath}`, error);
      }
  }, 2 * 60 * 1000); // 2 minutes in milliseconds
}


export async function setXp(jid: string, min: number, max: number): Promise<void> {
    const Xp = Math.floor(Math.random() * max) + min;
    try {
        const userRef = db.collection('users').doc(jid);
        await userRef.update({ Xp: admin.firestore.FieldValue.increment(Xp) });
        console.log(`User XP incremented by ${Xp} for user: ${jid}`);
    } catch (error) {
        console.error('Error updating XP:', error);
        await db.collection('users').doc(jid).set({ jid, Xp });
        console.log(`User XP record created with ${Xp} XP for user: ${jid}`);
    }
}

export async function ensureAuthenticated(ctx: any, next: Function) {
  const userId = ctx._sender.jid; // Extract userId from context

  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    ctx.reply('Invalid user ID. Please write !register');
    return;
  }
}


// In-memory map to track initiators
export const initiatorMap: { [key: string]: string } = {};

// Helper function to clear the initiator map
export function clearInitiator(jid: string) {
  delete initiatorMap[jid];
}

// Function to get user data from Firestore
export async function getUser(jid: string): Promise<FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>> {
  return await db.collection('users').doc(jid).get();
}
export async function checkAdmin(ctx: Ctx, id: string): Promise<boolean> {
  try {
    const members = await ctx?.group()?.members()!;
    
    // Check if the given ID is an admin (or superadmin)
    const isAdmin = members.some((m) => (m.admin === "superadmin" || m.admin === "admin") && m.id === id);
    
    return isAdmin;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false; // Default to false in case of an error
  }
}

     // Function to generate a unique session ID based on user ID and current timestamp
     export function generateSessionId(userId:string) {
      return `${userId}-${Date.now()}`;
    }

    // Function to get MIME type based on file extension
function getMimeType(fileExtension: string): string {
  switch (fileExtension.toLowerCase()) {
    case '.pdf':
      return 'application/pdf';
    case '.docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case '.accdb':
      return 'application/msaccess';
    default:
      throw new Error(`Unsupported file type: ${fileExtension}`);
  }
}

// Utility function to log messages
export function logMessage(message: string) {
  Cfont.say(
    `[INFO][Message]: ${message}\n`, {
        font: "console",
        align: 'left',
        gradient: ["red", "magenta"]
    });
}

let isMuted: boolean = false;

export const isMutedFn = (): boolean => isMuted;

export const muteBot = (): void => {
    isMuted = true;
};

export const unmuteBot = (): void => {
    isMuted = false;
};


/*let isMuted: boolean = false;

// Load initial mute state from the database
const initializeMuteState = async () => {
    isMuted = await dbHandler.getMuteState();
};

export const isMutedFn = (): boolean => isMuted;

export const muteBot = async (): Promise<void> => {
    isMuted = true;
    await dbHandler.setMuteState(true); // Save mute state to the database
};

export const unmuteBot = async (): Promise<void> => {
    isMuted = false;
    await databaseHandler.setMuteState(false); // Save unmute state to the database
};

// Initialize the mute state when the application starts
initializeMuteState().catch(err => console.error('Failed to initialize mute state:', err));
*/