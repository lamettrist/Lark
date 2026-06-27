/*
    Compile the file
*/
await Bun.build({
  entrypoints: ['./cli.tsx'],
  target: 'bun',
  outdir: './build',
  'compile': true,
  'bytecode': true,
});

console.log("Compiled!");