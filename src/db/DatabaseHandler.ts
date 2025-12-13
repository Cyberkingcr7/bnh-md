
import * as admin from 'firebase-admin';  // Firebase Admin SDK
import { Ctx } from "../lib/ctx";
import  path from 'path'

// Adjusted to point to the correct path from 'src/db/file.ts' to 'dir/william-...json'
const serviceAccount = require(path.join(process.cwd(), 'sui.json'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'bnhh-dd880.appspot.com',
  });
}


// Shared context object to store the current Ctx
let currentCtx: Ctx | null = null;

// Function to set the global context
export function setGlobalCtx(ctx: Ctx) {
    currentCtx = ctx;
}

export const db = admin.firestore();

// Define types for Firestore documents
interface Move {
  name: string;     // Name of the move (e.g., "Thunderbolt")
  power: number;    // Power of the move (e.g., 90)
  type: string;     // Type of the move (e.g., "Electric")
}




interface BlackMarketBoost {
  time: number;
  multiplier: number;
}

interface UserDocument {
  phoneNumber?: string;
  role?: string;
  jid?: string;
  wallet?: number;
  gamble?: number
  bank?: number;
  Xp?: number;
  bio?:string
  level?: number;
  ban?: boolean;
  downloadCount?: number;
  lastDownload?: number;
  caughtPokemons?: CaughtPokemon[];
  lastDaily?: number;
  lastRob?: number;
  claimedCards?: ClaimedCard[];
  profilePicture?:string
  black_market?: {
    boost: BlackMarketBoost;
  };
  crime?: number; // Add the crime property here (timestamp of the last crime)
  items?: { [key: string]: number }; // Add the items property here
  work?: number; // Add the work property here (timestamp of the last work)
  beg?: { cooldown: string }; // Add the beg cooldown property here
}


interface GroupSettingsDocument {
  economy?: boolean;
  antilink?: boolean;
  welcomeEnabled?: boolean; // The field for enabling/disabling welcome messages
}
// Database update functions
export class DatabaseHandler {

  async addUser(phoneNumber: string, role: string): Promise<void> {
    try {
      await db.collection('users').doc(phoneNumber).set({
        phoneNumber,
        role
      }, { merge: true });
    } catch (error) {
      console.error('Error adding user:', error);
    }
  }
  

  async deleteUser(userId:string) {
    try {
      const userRef = db.collection('users').doc(userId);
      await userRef.delete();
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  async getUserRole(phoneNumber: string): Promise<string | null> {
    try {
      const userDoc = await db.collection('users').doc(phoneNumber).get();
      return userDoc.exists ? userDoc.data()?.role || null : null;
    } catch (error) {
      console.error('Error retrieving user role:', error);
      return null;
    }
  }
  async updateUser(userId: string, data: object) {
    try {
      await db.collection('users').doc(userId).update(data);
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Error updating user data');
    }
  }  // Inside DatabaseHandler class

  // Method to get group settings
  async getGroupSettings(groupId: string): Promise<GroupSettingsDocument | null> {
    try {
      const groupSettingsDoc = await db.collection('groupSettings').doc(groupId).get();
      return groupSettingsDoc.exists ? groupSettingsDoc.data() as GroupSettingsDocument : null;
    } catch (error) {
      console.error('Error retrieving group settings:', error);
      return null;
    }
  }

 async getWelcomeEnabled(groupId: string): Promise<boolean | undefined> {
    try {
      const groupRef = db.collection('groupSettings').doc(groupId);
      const groupDoc = await groupRef.get();
      return groupDoc.exists ? groupDoc.data()?.welcomeEnabled : undefined;
    } catch (error) {
      console.error('Error getting welcome setting:', error);
      return undefined;
    }
  }
  

  async setWelcomeEnabled(groupId: string, welcomeEnabled: boolean): Promise<void> {
    try {
      await db.collection('groupSettings').doc(groupId).set(
        { welcomeEnabled }, 
        { merge: true }  // This ensures we don't overwrite other settings in the document
      );
    } catch (error) {
      console.error('Error setting welcomeEnabled:', error);
    }
  }
  
 // Consolidated methods for setting and getting Forex status
// Example implementation for clearUserWarnings
async clearUserWarnings(groupId: string, userId: string): Promise<void> {
  // Replace with actual database logic
  const userWarnings = await db.collection("warnings").doc(groupId).get();
  
  if (userWarnings.exists) {
      const warnings = userWarnings.data();
      if (warnings && warnings[userId]) {
          delete warnings[userId]; // Remove user's warnings
          await db.collection("warnings").doc(groupId).set(warnings);
      }
  }
}

// Set Forex status (enabled or disabled)
async setForexEnabled(groupId: string, enabled: boolean): Promise<void> {
  try {
    await db.collection('groupSettings').doc(groupId).set({
      forex: enabled
    }, { merge: true });
    console.log(`Forex status for group ${groupId} set to: ${enabled}`);
  } catch (error) {
    console.error('Error setting Forex status:', error);
  }
}


// Get Forex status (true or false)
async isForexEnabled(groupId: string): Promise<boolean> {
  try {
    const groupSettingsDoc = await db.collection('groupSettings').doc(groupId).get();
    return groupSettingsDoc.exists ? groupSettingsDoc.data()?.forex ?? false : false;
  } catch (error) {
    console.error('Error checking Forex status:', error);
    return false; // Default to false if there's an error
  }
}

// Get all groups with Forex enabled
async getAllForexEnabledGroups(): Promise<string[]> {
  try {
    const snapshot = await db.collection('groupSettings').where('forex', '==', true).get();
    return snapshot.docs.map(doc => doc.id); // Returns group IDs with Forex enabled
  } catch (error) {
    console.error('Error retrieving groups with Forex enabled:', error);
    return [];
  }
}


  // Method to update group settings
  async updateGroupSettings(groupId: string, settings: GroupSettingsDocument): Promise<void> {
    try {
      await db.collection('groupSettings').doc(groupId).set(settings, { merge: true });
    } catch (error) {
      console.error('Error updating group settings:', error);
    }
  }


  async hasRole(phoneNumber: string, role: string): Promise<boolean> {
    const userRole = await this.getUserRole(phoneNumber);
    return userRole === role;
  }
   // Check if user can download, increment if allowed, and reset if time limit reached
   async canDownload(userId: string): Promise<boolean> {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const now = Date.now();

    if (userDoc.exists) {
      const userData = userDoc.data();
      const downloadCount = userData?.downloadCount || 0;
      const lastDownload = userData?.lastDownload || 0;

      // Check if 2 hours have passed since the last download
      if (now - lastDownload >= 2 * 60 * 60 * 1000) {
        // Reset download count and update last download time
        await userRef.update({
          downloadCount: 1,
          lastDownload: now
        });
        return true;
      }

      if (downloadCount < 20) {
        // Increment download count and update last download time
        await userRef.update({
          downloadCount: admin.firestore.FieldValue.increment(1),
          lastDownload: now
        });
        return true;
      } else {
        return false; // Download limit reached
      }
    } else {
      // Initialize user with first download count if not existing
      await userRef.set({ jid: userId, downloadCount: 1, lastDownload: now });
      return true;
    }
  }

  // Method to reset download count after 2 hours (optional but can be useful)
  async resetDownloadCount(userId: string): Promise<void> {
    const userRef = db.collection('users').doc(userId);
    const now = Date.now();
    await userRef.update({ downloadCount: 0, lastDownload: now });
  }

  // Method to calculate level based on XP
  calculateLevel(xp: number): number {
    // Example level calculation logic, you can adjust the formula as needed
    const level = Math.floor(Math.sqrt(xp / 100)); // Example: sqrt(XP / 100) gives level.
    return level;
  }


  async setXp(jid: string, min: number, max: number): Promise<void> {
    const Xp = Math.floor(Math.random() * max) + min;
    try {
      const userRef = db.collection('users').doc(jid);
      await userRef.update({ Xp: admin.firestore.FieldValue.increment(Xp) });
      await this.updateLevel(jid);
    } catch (error) {
      console.error('Error updating XP:', error);
      await db.collection('users').doc(jid).set({ jid, Xp });
    }
  }


  // Method to update user level based on XP
  async updateLevel(jid: string): Promise<void> {
    const userRef = db.collection('users').doc(jid);
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      const xp = userData?.Xp || 0;
      const level = this.calculateLevel(xp);  // Calculate level based on XP
      await userRef.update({ level });
    }
  }

  
  async ensureNoRole(phoneNumber: string): Promise<void> {
    const userRole = await this.getUserRole(phoneNumber);
    if (userRole) {
      await db.collection('users').doc(phoneNumber).update({
        role: null
      });
    }
  }
    // Set the mute state for the bot
    async setMuteState(isMuted: boolean): Promise<void> {
      try {
        await db.collection('settings').doc('bot').set({ muted: isMuted }, { merge: true });
        console.log(`Mute state updated to: ${isMuted}`);
      } catch (error) {
        console.error('Error setting mute state:', error);
      }
    }
  
    // Get the current mute state of the bot
    async getMuteState(): Promise<boolean> {
      try {
        const muteDoc = await db.collection('settings').doc('bot').get();
        return muteDoc.exists ? muteDoc.data()?.muted || false : false;
      } catch (error) {
        console.error('Error getting mute state:', error);
        return false; // Default to unmuted on error
      }
    }
  
    // Ensure the mute state document exists, initializing it if necessary
    async initializeMuteState(): Promise<void> {
      try {
        const muteDoc = await db.collection('settings').doc('bot').get();
        if (!muteDoc.exists) {
          await db.collection('settings').doc('bot').set({ muted: false });
          console.log('Mute state initialized to false.');
        }
      } catch (error) {
        console.error('Error initializing mute state:', error);
      }
    }
  
  
  async setEconomyStatus(groupId: string, status: boolean): Promise<void> {
    try {
      await db.collection('groupSettings').doc(groupId).set({
        economy: status
      }, { merge: true });
    } catch (error) {
      console.error('Error setting economy status:', error);
    }
  }
  
  
  async getEconomyStatus(groupId: string): Promise<boolean | undefined> {
    try {
      const groupRef = db.collection('groupSettings').doc(groupId);
      const groupDoc = await groupRef.get();
      return groupDoc.exists ? groupDoc.data()?.economy : undefined;
    } catch (error) {
      console.error('Error getting economy status:', error);
      return undefined;
    }
  }

  async banUser(jid: string): Promise<void> {
    try {
      await db.collection('users').doc(jid).update({ ban: true });
    } catch {
      await db.collection('users').doc(jid).set({ jid, ban: true });
    }
  }

  async unbanUser(jid: string): Promise<void> {
    try {
      await db.collection('users').doc(jid).update({ ban: false });
    } catch {
      await db.collection('users').doc(jid).set({ jid, ban: false });
    }
  }

  async ensureUserExists(jid: string): Promise<void> {
    const userRef = db.collection('users').doc(jid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      await userRef.set({ jid, wallet: 0, bank: 0 });
    }
  }

async getUser(jid: string): Promise<FirebaseFirestore.DocumentSnapshot<UserDocument>> {
  return await db.collection('users').doc(jid).get();
}

  async updateUserField(jid: string, field: string, value: any): Promise<void> {
    const userRef = db.collection('users').doc(jid);
    await userRef.update({ [field]: value });
  }


  async setAntilink(groupId: string, antiLink: boolean): Promise<void> {
    try {
      await db.collection('groupSettings').doc(groupId).set({ antilink: antiLink }, { merge: true });
    } catch (error) {
      console.error('Error setting anti-link:', error);
    }
  }
  
  async getWelcome(groupId: string): Promise<boolean | undefined> {
    try {
      const groupRef = db.collection('groupSettings').doc(groupId);
      const groupDoc = await groupRef.get();
      if (groupDoc.exists) {
        const data = groupDoc.data();
        console.log(`Document data for group ${groupId}:`, data);
        
        // Wait for a brief period to ensure the data is fully loaded
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1-second delay
  
        return data?.welcome; // Return the welcome field or undefined
      } else {
        console.log(`No document found for group ${groupId}`);
        return undefined;
      }
    } catch (error) {
      console.error('Error getting welcome setting:', error);
      return undefined;
    }
  }
  
  
  async setWelcome(groupId: string, welcomeEnabled: boolean): Promise<void> {
    try {
      await db.collection('groupSettings').doc(groupId).set({ welcome: welcomeEnabled }, { merge: true });
      console.log(`Set welcome setting for group ${groupId} to ${welcomeEnabled}`);
    } catch (error) {
      console.error('Error setting welcome:', error);
    }
  }
  
  
  // Get the number of warnings for a user in a group
async getUserWarnings(groupId: string, userId: string): Promise<number> {
  try {
    const userWarningsRef = db.collection('groupWarnings').doc(`${groupId}_${userId}`);
    const userWarningsDoc = await userWarningsRef.get();

    if (!userWarningsDoc.exists) {
      return 0; // No warnings yet
    }

    return userWarningsDoc.data()?.warnings || 0;
  } catch (error) {
    console.error('Error getting user warnings:', error);
    return 0;
  }
}

// Set the warning count for a user
async setUserWarnings(groupId: string, userId: string, warnings: number): Promise<void> {
  try {
    await db.collection('groupWarnings').doc(`${groupId}_${userId}`).set({ warnings }, { merge: true });
    console.log(`Warning count for ${userId} in ${groupId} updated to: ${warnings}`);
  } catch (error) {
    console.error('Error setting user warnings:', error);
  }
}


// Method to get anime feature status for a group
async getAnimeStatus(groupId: string): Promise<boolean | undefined> {
  try {
    const groupRef = db.collection('groupSettings').doc(groupId);
    const groupDoc = await groupRef.get();
    return groupDoc.exists ? groupDoc.data()?.anime : undefined;
  } catch (error) {
    console.error('Error getting anime status:', error);
    return undefined;
  }
}
async getGroupsWithAnimeEnabled(): Promise<string[]> {
  try {
      const snapshot = await db.collection('groupSettings').where('anime', '==', true).get();
      return snapshot.docs.map(doc => doc.id); // Assuming the document ID is the group ID
  } catch (error) {
      console.error('Error retrieving groups with economy enabled:', error);
      return [];
  }
}



async getAntilink(groupId: string): Promise<boolean> {
  try {
    const groupRef = db.collection('groupSettings').doc(groupId);
    const groupDoc = await groupRef.get();
    return groupDoc.exists ? groupDoc.data()?.antilink === true : false;
  } catch (error) {
    console.error('Error getting anti-link setting:', error);
    return false;
  }
}

  // Methods to save/get NSFW toggle setting from the database
  async setNSFWCheck(groupId: string, nsfwEnabled: boolean): Promise<void> {
    try {
      await db.collection('groupSettings').doc(groupId).set({ nsfw: nsfwEnabled }, { merge: true });
      console.log(`Set NSFW check setting for group ${groupId} to ${nsfwEnabled}`);
    } catch (error) {
      console.error('Error setting NSFW:', error);
    }
  }
  
  async getNSFWCheck(groupId: string): Promise<boolean> {
    try {
      const groupRef = db.collection('groupSettings').doc(groupId);
      const groupDoc = await groupRef.get();
      if (groupDoc.exists) {
        const data = groupDoc.data();
        console.log(`Document data for group ${groupId}:`, data);
        
        // Default to false if nsfw is not defined in the database
        return data?.nsfw ?? false;
      } else {
        console.log(`No document found for group ${groupId}`);
        return false; // Default to false if no document found
      }
    } catch (error) {
      console.error('Error getting NSFW setting:', error);
      return false; // Default to false if there's an error
    }
  }
  


// DatabaseHandler.ts
async getGroupsWithWelcomeEnabled(): Promise<string[]> {
  try {
    const groupsSnapshot = await db.collection('groupSettings')
      .where('welcomeEnabled', '==', true)
      .get();

    const groupIds: string[] = [];
    groupsSnapshot.forEach((doc) => {
      groupIds.push(doc.id);  // Add the group ID to the array
    });
    return groupIds;
  } catch (error) {
    console.error('Error fetching groups with welcome enabled:', error);
    return [];
  }
}
}

export const dbHandler = new DatabaseHandler();
// Function to generate a random password
async function generateRandomPassword(length = 8) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}