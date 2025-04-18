import fs from 'fs';
import path from 'path';

const publicDir = path.join(process.cwd(), 'server', 'public');

// 1. Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 2. Check for Vite's manifest to get hashed filenames
const manifestPath = path.join(publicDir, 'manifest.json');
let manifest = {};
if (fs.existsSync(manifestPath)) {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
}

// 3. Process index.html
const viteIndexPath = path.join(publicDir, 'index.html');
if (fs.existsSync(viteIndexPath)) {
  let viteHtml = fs.readFileSync(viteIndexPath, 'utf-8');
  
  // Add CSP meta tag
  const cspMeta = `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' wss: https:;">`;
  viteHtml = viteHtml.replace(/<head>/, `<head>${cspMeta}`);

  // Update script paths using manifest
  if (manifest['index.html']?.file) {
    const mainJs = `/assets/${manifest['index.html'].file}`;
    viteHtml = viteHtml.replace(
      /<script type="module".*?><\/script>/,
      `<script type="module" src="${mainJs}"></script>`
    );
  }

  fs.writeFileSync(viteIndexPath, viteHtml);
  console.log('Updated index.html with CSP and correct asset paths');
} else {
  // Fallback HTML
  fs.writeFileSync(viteIndexPath, `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
      <title>Loading...</title>
    </head>
    <body>
      <div id="root"></div>
    </body>
  </html>`);
}

// 4. Handle favicon
const faviconPath = path.join(publicDir, 'favicon.ico');
if (!fs.existsSync(faviconPath)) {
  fs.writeFileSync(faviconPath, Buffer.from([]));
}