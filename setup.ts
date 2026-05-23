/*
  Very simple setup script.
*/
import { styleText } from "node:util";
import { $ } from "bun";

console.clear(); // Clear console

// Log the ASCII + Setup
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
  `,
  ),
  styleText(
    "green",
    `
Lark Setup v0.1-Alpha

  `,
  ),
  styleText(
    "blue",
    `
> ${styleText("yellow", "I'm currently setting up the Lark environment.")}
    `,
  ),
);

// Execute these two commands
await $`bun install`;
await $`bunx drizzle-kit push`;

// Say all complete!
console.log(
  styleText(
    "blue",
    `\n> ${styleText("bold", styleText("yellow", "All set! Lark is ready for you to use. Have a great time!"))}`,
  ),
);
