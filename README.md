# BNH Bot

A WhatsApp bot built with Node.js, TypeScript, and Firebase.

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [Firebase](https://firebase.google.com/) account and project

## Installation

1.  **Clone the repository:**

    ```bash
    git clone <your-repo-url>
    cd neko
    ```

2.  **Install dependencies:**

    ```bash
    yarn install
    # or
    npm install
    ```

3.  **Firebase Setup:**

    This bot uses Firebase for its database. You need to provide a service account key.

    1.  Go to the [Firebase Console](https://console.firebase.google.com/).
    2.  Select your project (or create a new one).
    3.  Go to **Project settings** > **Service accounts**.
    4.  Click **Generate new private key**.
    5.  A JSON file will be downloaded.
    6.  **Rename this file to `sui.json`**.
    7.  **Place `sui.json` in the root directory** of the project (the same folder as `package.json`).

    > **Important:** Do not share your `sui.json` file. It contains sensitive credentials.

## Running the Bot

To start the bot, run:

```bash
yarn install
tsc
npm start
```

## Creating a Command

You can add new commands by creating files in the `src/cmd` directory. You can organize them into subfolders (e.g., `src/cmd/General`, `src/cmd/MyCategory`).

### Basic Command Example

Create a new file, for example `src/cmd/General/hello.ts`:

```typescript
import { Ctx } from "../../lib/ctx";

module.exports = {
  name: "hello",          // The command name (e.g., !hello)
  category: "General",    // Category for the help menu
  code: async (ctx: Ctx) => {
    // ctx contains information about the message and sender
    
    // Reply to the user
    await ctx.reply("Hello there! 👋");
  },
};
```

### Command Structure

- **name**: The trigger for the command (without the prefix).
- **category**: The category under which the command will appear in the help menu.
- **code**: An async function that executes the command logic. It receives a `ctx` (Context) object.

### The `ctx` Object

The `ctx` object provides helper methods and properties to interact with the message and the user.

- `ctx.reply(text)`: Reply to the message with text.
- `ctx.sender.jid`: The JID (ID) of the sender.
- `ctx.args`: Array of arguments passed to the command.

