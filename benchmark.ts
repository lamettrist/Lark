/*
  Benchmarking software for the Lark framework with other decision-making frameworks, to assess its performance
*/
import { db } from "./lib/db/db";
import { tokenUsage } from "./lib/db/schema";

// Delete all files in DB first
await db.delete(tokenUsage);
