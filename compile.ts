/*
    Compile the file
*/
await Bun.build({
  entrypoints: ['./cli.tsx', './lib/communication.ts', './lib/stakeholders/worker.ts'],
  target: 'bun',
  compile: {
    outfile: './build/cli',
  },
  minify: true,
});
await Bun.build({
  entrypoints: ['./cli.tsx', './lib/communication.ts', './lib/stakeholders/worker.ts'],
  target: 'bun',
  minify: true,
});
console.log("Compiled both binary and source to ./build");