import { Ctx } from "../../lib/ctx";
import { db } from "../../db/DatabaseHandler";
import { FieldValue } from "firebase-admin/firestore";

module.exports = {
  name: "logout",
  category: "User",
  code: async (ctx: Ctx) => {
    const currentActingJid = ctx.sender.jid;

    try {
      // Look for the user whose actingAs is the current user
      const snapshot = await db
        .collection("users")
        .where("actingAs", "==", currentActingJid)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return ctx.reply("ℹ️ You are not currently logged into another account.");
      }

      const originalUserDoc = snapshot.docs[0];
      const originalUserId = originalUserDoc.id;

      // Remove actingAs field from original user's doc
      await db.collection("users").doc(originalUserId).update({
        actingAs: FieldValue.delete(),
      });

      return ctx.reply("✅ Successfully logged out and returned to your main account.");
    } catch (error) {
      console.error("Logout error:", error);
      return ctx.reply("❌ An error occurred while logging out. Please try again.");
    }
  },
};
