import * as dotenv from 'dotenv';
import { DatabaseHandler, db } from '../db/DatabaseHandler';
import { bot } from './main';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const dbHandler = new DatabaseHandler();

export async function initializeUserRoles() {
    await dbHandler.addUser(process.env.ROOT_PHONE_NUMBER!, 'superuser');
    await dbHandler.addUser(process.env.LYNX_PHONE_NUMBER!, 'poweruser');
}

export async function clearRolesForOthers() {
    // Fetch all users
    const allUsers = await db.collection('users').get();
    allUsers.forEach(async (userDoc) => {
        const phoneNumber = userDoc.id;
        if (![process.env.ROOT_PHONE_NUMBER, process.env.LYNX_PHONE_NUMBER].includes(phoneNumber)) {
            await dbHandler.ensureNoRole(phoneNumber);
        }
    });
}

// Save bot's phone number to a JSON file in the root directory
export async function saveBotPhoneNumber() {
    const botPhoneNumber = '';

    const botInfo = {
        phoneNumber: botPhoneNumber,
    };

    const filePath = path.join(__dirname, '..', '..', 'botInfo.json'); // Save in the root directory

    // Write the bot info to a JSON file asynchronously
    fs.writeFile(filePath, JSON.stringify(botInfo, null, 2), 'utf8', (err) => {
        if (err) {
            console.error('Error writing bot phone number to file:', err);
        } else {
            console.log('Bot phone number saved to botInfo.json in the root directory');
        }
    });
}
