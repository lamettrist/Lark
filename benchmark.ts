/*
  Benchmarking software for the Lark framework that leverages tasks,
  functions that have a default export and are automatically imported and executed
*/
import { Glob } from "bun";
import { db } from "./lib/db/db";
import { tokenUsage } from "./lib/db/schema";

// Delete all files in DB first
await db.delete(tokenUsage);

/*
  Discover new JS files in benchmarking/tasks and load default functions
*/
const glob = new Glob("*.{ts,tsx}"); // Apparently using the examples work
const scannedFiles = await Array.fromAsync(
  glob.scan({ cwd: "./benchmarking/tasks" }),
);
// Loader
for (const file of scannedFiles) {
  const task = await import(`./benchmarking/tasks/${file}`);
  console.log(await task.default()); // FINALLY IT WORKS (one much imagine me happy after getting this to work)
}
