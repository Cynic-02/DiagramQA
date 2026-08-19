import fs from 'fs'; import path from 'path';
const R = process.cwd(); const log = [];
const files = [
  'src/app/app/agents/page.tsx',
  'src/app/app/history/page.tsx',
  'src/app/app/settings/account/page.tsx',
  'src/app/app/settings/api-keys/page.tsx',
];
/* Each of these painted an opaque background AND laid its own second grid
   on top of the page one, so the texture differed route to route. The page
   grid is the surface; nothing should repaint it. */
for (const f of files) {
  const p = path.join(R, f);
  if (!fs.existsSync(p)) { log.push('MISSING ' + f); continue; }
  const a = fs.readFileSync(p, 'utf8');
  const b = a
    .replace(/\s*grid-faint-lighter\s*bg-background/g, '')
    .replace(/\s*grid-faint-lighter/g, '')
    .replace(/flex min-h-screen flex-col\s+bg-background"/g, 'flex min-h-screen flex-col"');
  if (a !== b) { fs.writeFileSync(p, b); log.push('edited ' + f); } else log.push('NO-OP ' + f);
}
/* The console footer sits on the same paper as everything else. */
const fp = path.join(R, 'src/app/app/page.tsx');
const fa = fs.readFileSync(fp, 'utf8');
const fb = fa.replace('<footer className="mt-auto border-t border-border/40 bg-background">',
                      '<footer className="mt-auto border-t border-border/40">');
if (fa !== fb) { fs.writeFileSync(fp, fb); log.push('edited src/app/app/page.tsx'); }
console.log(log.join('\n'));
