// scripts/prepare-zxing.js
// Copia el UMD de @zxing/browser a /vendor/zxing/index.min.js para servirlo desde tu dominio

const fs = require('fs');
const path = require('path');

const src = path.join(process.cwd(), 'node_modules', '@zxing', 'browser', 'umd', 'index.min.js');
const destDir = path.join(process.cwd(), 'vendor', 'zxing');
const dest = path.join(destDir, 'index.min.js');

fs.mkdirSync(destDir, { recursive: true });

if (!fs.existsSync(src)) {
  console.error('❌ No se encontró el UMD de ZXing en:', src);
  process.exit(1);
}

fs.copyFileSync(src, dest);
console.log('✅ ZXing copiado a', dest);
