import { styleText } from "util";
import { MasterAgent } from "./lib/agents";
import { models } from "./lib/models";
import { tokenUsage } from "./lib/db/schema";
import { db } from "./lib/db/db";
import { sum } from "drizzle-orm";

// Delete all files in DB first
await db.delete(tokenUsage);


console.log(
  styleText(
    "red",
    `
.----------------.
|                |
|                |
|                |
|    X      X    |
|   X X    X X   |
|  X   X  X   X  |
|                |
|                |
\`----------------\'
${styleText("bold", styleText("green", "Lark Inference"))}
Type "ex" or "exit" to exit the conversation.
`,
  ),
);
const model = new MasterAgent(models[0]);
while (true) {
  const input = prompt(styleText("blue", ">"));
  if (input == "exit" || input == "ex") {
    break;
  } else if (input == null) {
    continue;
  } else {
    console.log(styleText("gray", await model.run(input)));
    const usage = await db
      .select({
        totalTokens: sum(tokenUsage.totalTokens),
        inputTokens: sum(tokenUsage.inputTokens),
        cost: sum(tokenUsage.cost),
      })
      .from(tokenUsage);
    console.log(
      `used $${usage[0].cost}, total ↓${usage[0].totalTokens} tokens, ↑${usage[0].inputTokens} tokens`,
    );
    // console.log("")
  }
}
