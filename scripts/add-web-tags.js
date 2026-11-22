// Runs after `expo export --platform web`.
// Adds tags to every exported HTML page so phones can save the site to the
// Home Screen and open it full screen like a real app, with its own icon and name.
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');

const TAGS = [
  '<meta name="apple-mobile-web-app-capable" content="yes"/>',
  '<meta name="mobile-web-app-capable" content="yes"/>',
  '<meta name="apple-mobile-web-app-title" content="Forkcast"/>',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default"/>',
  '<meta name="theme-color" content="#F6F5F2"/>',
  '<meta name="description" content="Snap your food, see the calories, hit your goal."/>',
  '<link rel="apple-touch-icon" href="/apple-touch-icon.png"/>',
  '<link rel="manifest" href="/manifest.json"/>',
  // Home Screen apps on iPhone draw under the status bar, but `height: 100%` leaves a strip uncovered,
  // which showed as a white band. Pin the page to the whole screen and give everything behind the app the app's background color.
  '<style id="forkcast-fit">' +
    'html,body{background-color:#F6F5F2;margin:0;padding:0}' +
    'body{position:fixed;top:0;right:0;bottom:0;left:0;overscroll-behavior:none;-webkit-text-size-adjust:100%}' +
    '#root{width:100%;height:100%;background-color:#F6F5F2;box-sizing:border-box;' +
    // Keep the app clear of the notch / Dynamic Island, the status bar and the home bar on every iPhone.
    'padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);' +
    'padding-left:env(safe-area-inset-left);padding-right:env(safe-area-inset-right)}' +
    '</style>',
].join('');

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(full);
    return entry.name.endsWith('.html') ? [full] : [];
  });
}

const files = htmlFiles(DIST);
for (const file of files) {
  let html = fs.readFileSync(file, 'utf8');
  if (html.includes('apple-mobile-web-app-capable')) continue; // already done
  html = html
    // Let the app draw under the iPhone's notch and status bar (the app pads for them itself).
    .replace(/<meta name="viewport" content="[^"]*"\/>/, '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>')
    .replace('</head>', `${TAGS}</head>`);
  // Give each page a proper title.
  html = html.includes('<title>') ? html : html.replace('</head>', '<title>Forkcast</title></head>');
  fs.writeFileSync(file, html);
}
console.log(`Added Home Screen tags to ${files.length} page(s).`);
