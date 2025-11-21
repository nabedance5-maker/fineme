// Simple srcset generator for local images
// Usage: node scripts/gen-srcset.js /path/to/image.jpg --sizes=320,640,1200
// Output files will be written next to original: image-320.jpg, image-640.jpg, ...

const fs = require('fs');
const path = require('path');

async function main(){
  const args = process.argv.slice(2);
  if(!args.length){
    console.log('Usage: node scripts/gen-srcset.js <input-image> [--sizes=320,640,1200]');
    process.exit(1);
  }
  const input = args[0];
  const sizeArg = (args.find(a=> a.startsWith('--sizes=')) || '--sizes=320,640,1200').split('=')[1];
  const sizes = sizeArg.split(',').map(s=> Number(s)).filter(Boolean);
  if(!sizes.length){ console.error('No sizes'); process.exit(1); }
  // lazy require sharp to avoid failing when not installed
  let sharp;
  try{ sharp = require('sharp'); }catch(e){ console.error('Please install sharp: npm install --save-dev sharp'); process.exit(1); }

  const src = path.resolve(process.cwd(), input);
  if(!fs.existsSync(src)){ console.error('Input not found:', src); process.exit(1); }
  const ext = path.extname(src); const base = path.basename(src, ext);
  const dir = path.dirname(src);
  for(const s of sizes){
    const out = path.join(dir, `${base}-${s}${ext}`);
    try{
      await sharp(src).resize({ width: s }).toFile(out);
      console.log('wrote', out);
    }catch(e){ console.error('failed for', s, e); }
  }
  console.log('done');
}

main();
