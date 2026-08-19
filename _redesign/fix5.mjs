import fs from 'fs'; import path from 'path';
const R = process.cwd(); const log = [];
function edit(f, fn){
  const p = path.join(R,f);
  if(!fs.existsSync(p)) return log.push('MISSING '+f);
  const a = fs.readFileSync(p,'utf8'); const b = fn(a);
  if(a!==b){ fs.writeFileSync(p,b); log.push('edited '+f) } else log.push('NO-OP '+f);
}

/* The login page painted an opaque background over the page grid, the
   same way the console did — so the one texture that is supposed to be
   identical everywhere was missing on the highest-intent route. */
edit('src/app/login/page.tsx', s => s
  .replace('<main className="relative flex min-h-screen flex-col bg-[var(--background)]">',
           '<main className="relative flex min-h-screen flex-col">')
);

/* The config rail can never again make the page taller than the screen:
   it is capped to the viewport and scrolls inside itself if a future
   panel is added. */
edit('src/components/stages/UploadStage.tsx', s => s
  .replace('<div className="min-w-0 space-y-5">',
           '<div className="scroll-slim min-w-0 space-y-4 xl:sticky xl:top-[4.75rem] xl:max-h-[calc(100vh-6.5rem)] xl:overflow-y-auto xl:pr-1">')
);

console.log(log.join('\n'));
