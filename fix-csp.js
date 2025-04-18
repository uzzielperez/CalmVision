import fs from 'fs';
import path from 'path';

// Create a barebones index.html with proper CSP
const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' wss: https:;">
  <title>CalmVision</title>
  <link rel="icon" type="image/svg+xml" href="/vite.svg" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/dist/index.js"></script>
</body>
</html>`;

// Make sure public directory exists
const publicDir = path.join(process.cwd(), 'server', 'public');
if (!fs.existsSync(publicDir)) {
  console.log('Creating public directory:', publicDir);
  fs.mkdirSync(publicDir, { recursive: true });
}

// Create a basic index.html file with proper CSP
fs.writeFileSync(path.join(publicDir, 'index.html'), htmlContent);
console.log('Created index.html with proper CSP headers');

// Create a simple favicon
const faviconDir = path.join(publicDir, 'favicon.ico');
if (!fs.existsSync(faviconDir)) {
  // Create a transparent 1x1 pixel ICO
  const emptyIcon = Buffer.from([
    0, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 16, 16,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
  ]);
  fs.writeFileSync(faviconDir, emptyIcon);
  console.log('Created empty favicon.ico');
}