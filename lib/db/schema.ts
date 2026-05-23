/*
  From https://orm.drizzle.team/docs/get-started/bun-sqlite-new
*/
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const tokenUsage = sqliteTable("modelUsage", {
  id: int().primaryKey({ autoIncrement: true }),
  totalTokens: int(),
  inputTokens: int(),
  cost: int(),
});

// export const usersTable = sqliteTable("users_table", {
//   id: int().primaryKey({ autoIncrement: true }),
//   name: text().notNull(),
//   age: int().notNull(),
//   email: text().notNull().unique(),
// });
