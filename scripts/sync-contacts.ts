/**
 * Manual script to sync all contacts to Loops
 * Run with: npm run sync-contacts
 */

// IMPORTANT: Load environment variables BEFORE importing modules
import dotenv from "dotenv";
dotenv.config();

async function main() {
  console.log("Starting contact sync...");
  const startTime = Date.now();

  try {
    // Dynamic import to ensure environment variables are loaded first
    const { syncAllContactsToLoops } = await import("../src/lib/loops/contacts.js");

    const result = await syncAllContactsToLoops();
    const duration = Date.now() - startTime;

    console.log("\n✅ Sync completed!");
    console.log(`Duration: ${duration}ms`);
    console.log(`Synced: ${result.synced}`);
    console.log(`Failed: ${result.failed}`);
    console.log(`Total: ${result.total}`);

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Sync failed:", error);
    process.exit(1);
  }
}

main();
