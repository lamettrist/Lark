/*
From https://orm.drizzle.team/docs/get-started/bun-sqlite-new
*/

import "dotenv/config";
import { drizzle } from "drizzle-orm/bun-sqlite";

export const db = drizzle(process.env.DB_FILE_NAME!);
