import fs from 'fs'; import path from 'path';
const R = process.cwd();
const log = [];
function edit(f, fn){
  const p = path.join(R,f);
  if(!fs.existsSync(p)) return log.push('MISSING '+f);
  const a = fs.readFileSync(p,'utf8'); const b = fn(a);
  if(a!==b){ fs.writeFileSync(p,b); log.push('edited '+f) } else log.push('NO-OP '+f);
}

/* The extraction preview had the same hover-tilt-and-zoom as upload:
   the image scaled past its own frame on hover. Diagrams sit still. */
edit('src/components/stages/ExtractionStage.tsx', s => {
  let t = s.replace(/<TiltedCard[\s\S]*?\/>/m, `<img
                    src={diagramUrl}
                    alt="Source diagram"
                    className="max-h-[300px] w-auto max-w-full object-contain"
                  />`);
  t = t.replace(/^import TiltedCard from '@\/components\/reactbits\/TiltedCard'\r?\n/m, '');
  return t;
});

edit('src/components/stages/UploadStage.tsx', s => s
  .replace(/\{\/\* Thumbnail [-—] TiltedCard lets you hover to zoom in and\r?\n\s*actually inspect the diagram\. \*\/\}/,
           '{/* The diagram, shown at rest and contained by its frame. */}'));

console.log(log.join('\n'));
