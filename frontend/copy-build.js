const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, 'build');
const dest = path.join(__dirname, '..');
if (fs.existsSync(src)) {
  const destStatic = path.join(dest, 'static');
  if (fs.existsSync(destStatic)) {
    fs.rmSync(destStatic, { recursive: true, force: true });
  }
  fs.cpSync(src, dest, { recursive: true, force: true });
  console.log('Successfully cleaned old static assets and copied build output from frontend/build to repository root.');
} else {
  console.error('Build directory not found:', src);
}