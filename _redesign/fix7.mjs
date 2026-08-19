import fs from 'fs'; import path from 'path';
const R = process.cwd(); const log = [];
function edit(f, fn){
  const p = path.join(R,f);
  if(!fs.existsSync(p)) return log.push('MISSING '+f);
  const a = fs.readFileSync(p,'utf8'); const b = fn(a);
  if(a!==b){ fs.writeFileSync(p,b); log.push('edited '+f) } else log.push('NO-OP '+f);
}

/* Upload preview: magnify in place, bounded by the frame. */
edit('src/components/stages/UploadStage.tsx', s => {
  let t = s;
  if (!t.includes("from '@/components/ui/lens'")) {
    t = t.replace("import { StageFrame, StageHeader, DataChip } from './shared'",
                  "import { Lens } from '@/components/ui/lens'\nimport { StageFrame, StageHeader, DataChip } from './shared'");
  }
  t = t.replace(`<img
                          src={previewUrl}
                          alt={previewName ?? 'Diagram preview'}
                          className="max-h-[260px] w-auto max-w-full object-contain"
                        />`,
`<Lens lensSize={340} zoomFactor={2.1}>
                          <img
                            src={previewUrl}
                            alt={previewName ?? 'Diagram preview'}
                            className="max-h-[260px] w-auto max-w-full object-contain"
                          />
                        </Lens>`);
  return t;
});

/* Extraction preview: same treatment, so the behaviour does not change
   between two stages that show the same picture. */
edit('src/components/stages/ExtractionStage.tsx', s => {
  let t = s;
  if (!t.includes("from '@/components/ui/lens'")) {
    t = t.replace(/^(import .*from '\.\/shared'.*)$/m, "import { Lens } from '@/components/ui/lens'\n$1");
  }
  t = t.replace(`<img
                    src={diagramDataUrl}
                    alt="Source diagram"
                    className="max-h-[300px] w-auto max-w-full object-contain"
                  />`,
`<Lens lensSize={340} zoomFactor={2.1}>
                    <img
                      src={diagramDataUrl}
                      alt="Source diagram"
                      className="max-h-[300px] w-auto max-w-full object-contain"
                    />
                  </Lens>`);
  return t;
});

console.log(log.join('\n'));
