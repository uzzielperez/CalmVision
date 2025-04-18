import fs from 'fs';
import path from 'path';

const publicDir = path.join(process.cwd(), 'server', 'public');

// 1. Only proceed if the public directory exists
if (!fs.existsSync(publicDir)) {
  console.log('Public directory not found, creating...');
  fs.mkdirSync(publicDir, { recursive: true });
}

// 2. Check if Vite's index.html exists
const viteIndexPath = path.join(publicDir, 'index.html');
if (fs.existsSync(viteIndexPath)) {
  // 3. Read Vite's built index.html
  let viteHtml = fs.readFileSync(viteIndexPath, 'utf-8');
  
  // 4. Add CSP meta tag while preserving existing content
  const cspMeta = `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' wss: https:;">`;
  
  viteHtml = viteHtml.replace(
    /<head>/,
    `<head>${cspMeta}`
  );
  
  // 5. Fix script path if needed (change /dist to /assets)
  viteHtml = viteHtml.replace(
    /src="\/dist\//g,
    'src="/assets/'
  );
  
  // 6. Write back the modified file
  fs.writeFileSync(viteIndexPath, viteHtml);
  console.log('Updated Vite index.html with CSP headers');
} else {
  console.log('Vite index.html not found, creating fallback...');
  // Fallback minimal HTML (only used if build failed)
  const fallbackHtml = `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Application Loading...</title>
    </head>
    <body>
      <div id="root">Loading application...</div>
    </body>
  </html>`;
  
  fs.writeFileSync(viteIndexPath, fallbackHtml);
}

// 7. Handle favicon (only create if missing)
const faviconPath = path.join(publicDir, 'favicon.ico');
if (!fs.existsSync(faviconPath)) {
  const emptyIcon = Buffer.from([
    0, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 16, 16,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
  ]);
  fs.writeFileSync(faviconPath, emptyIcon);
  console.log('Created empty favicon.ico');
}