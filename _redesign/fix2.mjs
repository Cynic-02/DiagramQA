import fs from 'fs'; import path from 'path';
const SRC = path.join(process.cwd(), 'src');
const files = [];
(function walk(d){ for (const e of fs.readdirSync(d,{withFileTypes:true})){
  const p = path.join(d,e.name);
  if (e.isDirectory()) walk(p); else if (/\.tsx?$/.test(e.name)) files.push(p);
}})(SRC);

const log = [];
function edit(file, fn) {
  const p = path.join(process.cwd(), file);
  if (!fs.existsSync(p)) { log.push('MISSING ' + file); return; }
  const before = fs.readFileSync(p,'utf8');
  const after = fn(before);
  if (after !== before) { fs.writeFileSync(p, after); log.push('edited ' + file); }
  else log.push('NO-OP ' + file);
}

/* 1 ── borders and hard shadows follow --line, not the text ink.
      In dark mode the ink is near-white and a 3px near-white rule around
      every panel reads as glare rather than structure. */
let n = 0;
for (const f of files) {
  const s = fs.readFileSync(f,'utf8');
  const t = s
    .replace(/border-\[var\(--ink\)\]/g, 'border-[var(--line)]')
    .replace(/_0_var\(--ink\)\]/g, '_0_var(--line)]')
    .replace(/0_var\(--ink\)\]/g, '0_var(--line)]');
  if (t !== s) { fs.writeFileSync(f, t); n++; }
}
log.push('--line applied in ' + n + ' files');

/* 2 ── StageFrame: the content column was capped at max-w-7xl and centred
      inside a much wider main column, so the gap to the sidebar was ~200px
      while the gap to the config rail was ~24px. One gutter, used
      everywhere. */
edit('src/components/stages/shared.tsx', s => s
  .replace('className="relative mx-auto w-full max-w-7xl p-6 md:p-8"',
           'className="relative mx-auto w-full max-w-[1680px] px-6 py-6 md:px-8 md:py-8"')
  .replace('className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius)] border border-dashed border-border bg-card px-6 py-16 text-center"',
           'className="flex min-h-[340px] flex-col items-center justify-center gap-3 rounded-[var(--radius)] border border-dashed border-border bg-card px-6 py-24 text-center"')
);

/* 3 ── the console lets the page grid through instead of painting over it
      with an opaque gradient plus a second, different grid. */
edit('src/components/layout/AppShell.tsx', s => s
  .replace('className="relative flex min-h-screen flex-col bg-background bg-gradient-to-b from-primary/[0.04] to-background"',
           'className="relative flex min-h-screen flex-col"')
  .replace(`            {/* Background: faint flat grid only — no atmospheric glow */}
            <div
              aria-hidden
              className="grid-faint pointer-events-none absolute inset-0 opacity-[0.035]"
            />

`, '')
);

edit('src/app/app/page.tsx', s => s
  .replace('className="relative flex min-h-screen flex-col grid-faint-lighter"',
           'className="relative flex min-h-screen flex-col"')
);

/* 4 ── the console pages were capped narrower than the shell they sit in,
      which is what left History looking like an empty room. */
for (const f of ['src/app/app/history/page.tsx','src/app/app/agents/page.tsx',
                 'src/app/app/settings/account/page.tsx','src/app/app/settings/api-keys/page.tsx']) {
  edit(f, s => s
    .replace(/max-w-7xl/g, 'max-w-[1680px]')
    .replace(/max-w-6xl/g, 'max-w-[1680px]')
    .replace(/max-w-5xl/g, 'max-w-[1400px]'));
}

/* 5 ── the upload preview no longer tilts and zooms past its own frame on
      hover. It is a diagram, not a trading card: it sits still and stays
      inside the box. */
edit('src/components/stages/UploadStage.tsx', s => {
  let t = s.replace(/<TiltedCard[\s\S]*?\/>/m, `<img
                          src={previewUrl}
                          alt={previewName ?? 'Diagram preview'}
                          className="max-h-[260px] w-auto max-w-full object-contain"
                        />`);
  t = t.replace('<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">',
                '<div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">');
  t = t.replace(/^import TiltedCard from '[^']*'\n/m, '');
  t = t.replace(/^import \{ TiltedCard \} from '[^']*'\n/m, '');
  return t;
});

console.log(log.join('\n'));
