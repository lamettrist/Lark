/*
    Lark Imperial CLI Tool
*/
import {render, Box, Text} from 'ink';
import '@dotenvx/dotenvx/config';
import { password } from '@clack/prompts';
import { $, write } from 'bun';
import {config} from '@dotenvx/dotenvx';
import { styleText } from "util";
import { tokenUsage } from "./lib/db/schema";
import { db } from "./lib/db/db";
import { sum } from "drizzle-orm";


let LARK_INITIAL_SETUP = false;

// Run function to check if platform is setup already
if (!process.env?.HACKCLUB_KEY) {
  LARK_INITIAL_SETUP = true;
}
let envContent = `# Seeded by Lark CLI\n# Do NOT share this information!\n\nDB_FILE_NAME="./session.db"`;

const larkRender = (message: string) => {
    return (
      <Box margin={2}>
        <Text color="redBright">
          {
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
            `
          }
        </Text>
        <Text bold color="blueBright">
          {
            message.toString()
          }
        </Text>
      </Box>
    );
}

if (LARK_INITIAL_SETUP) {
  console.clear();
  render(larkRender(`
            Welcome to Lark!
            Now, let's setup your assistant.
            `))  
  const hackclubKey = await password({
    message: 'Please provide your Hack Club AI API Key (please obtain one at ai.hackclub.com):',
    mask: '*',
    validate(value) {
      if (!value.startsWith('sk-hc-v1-')) {
        return "This isnt a valid API key!"
      }
    },
  });
  await $`bun install`;
  envContent += `\nHACKCLUB_KEY="${hackclubKey.toString()}"`;
  write('.env', envContent, {'createPath': true});
  await $`bunx drizzle-kit push`;
  config();
  console.clear();
  render(larkRender(`
          We're done setting up Lark! 
          Now it's time for you to play and make it yours!  
          Rerun the CLI to continue anew         
  `))
} else {
  const {MasterAgent} = await import("./lib/agents")
  const {models} = await import('./lib/models');
  console.clear();
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
    try {
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
    } catch {}
  }
}

