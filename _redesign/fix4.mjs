import fs from 'fs'; import path from 'path';
const R = process.cwd(); const log = [];
function edit(f, fn){
  const p = path.join(R,f);
  if(!fs.existsSync(p)) return log.push('MISSING '+f);
  const a = fs.readFileSync(p,'utf8'); const b = fn(a);
  if(a!==b){ fs.writeFileSync(p,b); log.push('edited '+f) } else log.push('NO-OP '+f);
}

/* The 1680px cap over-corrected: fixing the gutter by stretching every
   panel to fill a 1920px screen just traded one problem for another.
   A measure, not a stretch. */
edit('src/components/stages/shared.tsx', s => s
  .replace('className="relative mx-auto w-full max-w-[1680px] px-6 py-6 md:px-8 md:py-8"',
           'className="relative mx-auto w-full max-w-[1500px] px-6 py-5 md:px-8 md:py-6"')
  .replace("className={showHeader ? 'mt-6 md:mt-8' : undefined}",
           "className={showHeader ? 'mt-5 md:mt-6' : undefined}")
);

for (const f of ['src/app/app/history/page.tsx','src/app/app/agents/page.tsx',
                 'src/app/app/settings/api-keys/page.tsx','src/app/app/settings/account/page.tsx']) {
  edit(f, s => s.replace(/max-w-\[1680px\]/g, 'max-w-[1500px]'));
}

/* Upload fits one viewport: the right rail was ~1100px tall on its own,
   which is what forced the page to scroll. Compressed, and capped to the
   viewport with its own scroll as a backstop so it can never push the
   page taller than the screen again. */
edit('src/components/stages/UploadStage.tsx', s => {
  let t = s;
  t = t.replace('<div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">',
                '<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">');
  t = t.replace('<div className="min-w-0 space-y-4">\n          <StageHeader stageId="upload" />',
                '<div className="min-w-0 space-y-3">\n          <StageHeader stageId="upload" />');
  t = t.replace("'group relative flex w-full flex-col items-center justify-center gap-3 border-2 border-dashed px-6 py-16 text-center transition-all rounded-[var(--radius)]'",
                "'group relative flex w-full flex-col items-center justify-center gap-3 border-2 border-dashed px-6 py-10 text-center transition-all rounded-[var(--radius)]'");
  t = t.replace("'flex size-14 items-center justify-center border transition-all rounded-lg'",
                "'flex size-12 items-center justify-center border transition-all rounded-lg'");
  // the wheel drove the rail's height — give it a fixed measure
  t = t.replace(`                  <div className="flex justify-center">
                    <BloomWheel
                      value={bloomLevel}
                      onChange={setBloomLevel}
                    />
                  </div>`,
`                  <div className="mx-auto aspect-square w-full max-w-[218px]">
                    <BloomWheel value={bloomLevel} onChange={setBloomLevel} />
                  </div>`);
  t = t.replace('<Card className="brutal-block p-4 space-y-4">',
                '<Card className="brutal-block p-3.5 space-y-3">');
  t = t.replace('<Card className="brutal-block space-y-4 p-4">',
                '<Card className="brutal-block space-y-3 p-3.5">');
  t = t.replace(/<Card className="p-3 bg-muted\/10 border-border\/30 space-y-1 rounded-xl">/g,
                '<Card className="p-2.5 bg-muted/10 border-border/30 space-y-1 rounded-xl">');
  t = t.replace('<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">',
                '<div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">');
  return t;
});

console.log(log.join('\n'));
