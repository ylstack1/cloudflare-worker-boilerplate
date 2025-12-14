import type { EdgeManifest } from '@edge-manifest/core';

export type AdminAssets = Record<string, string>;

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildIndexHtml(manifest: EdgeManifest): string {
  const links = manifest.entities
    .map((e) => {
      const plural = `${e.name.toLowerCase()}s`;
      return `<li><a href="#/${plural}">${escapeHtml(e.name)}</a></li>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(manifest.name)} Admin</title>
    <link rel="stylesheet" href="/admin/styles.css" />
  </head>
  <body>
    <header>
      <h1>${escapeHtml(manifest.name)} Admin</h1>
      <nav>
        <ul>
          ${links}
        </ul>
      </nav>
      <p class="meta">API: <code>/api/*</code> • Docs: <a href="/docs">/docs</a></p>
    </header>

    <main>
      <div id="app"></div>
    </main>

    <script type="module" src="/admin/admin.js"></script>
  </body>
</html>`;
}

function buildStyles(): string {
  return `:root {
  --bg: #0b1220;
  --panel: #0f1a30;
  --text: #e6eefc;
  --muted: #9fb2d6;
  --border: #203253;
  --accent: #5aa7ff;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
  background: var(--bg);
  color: var(--text);
}

header {
  padding: 24px;
  border-bottom: 1px solid var(--border);
  background: var(--panel);
}

header h1 {
  margin: 0 0 12px;
  font-size: 20px;
}

nav ul {
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  list-style: none;
}

nav a {
  color: var(--accent);
  text-decoration: none;
}

.meta {
  margin: 12px 0 0;
  color: var(--muted);
}

main {
  padding: 24px;
}

.panel {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--panel);
  padding: 16px;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
}

th, td {
  padding: 8px;
  border-bottom: 1px solid var(--border);
  text-align: left;
}

code {
  background: rgba(255, 255, 255, 0.06);
  padding: 2px 6px;
  border-radius: 6px;
}`;
}

function buildAdminJs(manifest: EdgeManifest): string {
  const entityRoutes = manifest.entities
    .map((e) => {
      const plural = `${e.name.toLowerCase()}s`;
      return `{ name: ${JSON.stringify(e.name)}, plural: ${JSON.stringify(plural)} }`;
    })
    .join(',\n  ');

  return `const entities = [
  ${entityRoutes}
];

const app = document.getElementById('app');

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function setHtml(html) {
  if (!app) return;
  app.innerHTML = html;
}

function renderHome() {
  setHtml(
    '<div class="panel">' +
      '<h2>Overview</h2>' +
      '<p>Pick an entity from the nav to inspect data via the generated CRUD API.</p>' +
      '<p>Tip: run <code>./test-endpoints.sh</code> while <code>pnpm dev</code> is running.</p>' +
      '</div>',
  );
}

async function renderEntity(plural) {
  const res = await fetch('/api/' + plural);
  const payload = await res.json();

  setHtml(
    '<div class="panel">' +
      '<h2>' +
      escapeHtml(plural) +
      '</h2>' +
      '<p>GET <code>/api/' +
      escapeHtml(plural) +
      '</code></p>' +
      '<pre>' +
      escapeHtml(JSON.stringify(payload, null, 2)) +
      '</pre>' +
      '</div>',
  );
}

function route() {
  const hash = location.hash.replace(/^#\\/?/, '');
  if (!hash) return renderHome();

  const match = entities.find((e) => e.plural === hash);
  if (!match) return renderHome();

  void renderEntity(match.plural);
}

window.addEventListener('hashchange', route);
route();
`;
}

export async function generateAdminAssets(manifest: EdgeManifest): Promise<AdminAssets> {
  return {
    'admin/index.html': buildIndexHtml(manifest),
    'admin/admin.js': buildAdminJs(manifest),
    'admin/styles.css': buildStyles(),
  };
}

export async function generateAdminAssetsModule(manifest: EdgeManifest): Promise<string> {
  const assets = await generateAdminAssets(manifest);

  const entries = Object.entries(assets)
    .map(([path, body]) => {
      const contentType = path.endsWith('.html')
        ? 'text/html; charset=utf-8'
        : path.endsWith('.css')
          ? 'text/css; charset=utf-8'
          : path.endsWith('.js')
            ? 'text/javascript; charset=utf-8'
            : 'application/octet-stream';

      return `  ${JSON.stringify(`/${path}`)}: { contentType: ${JSON.stringify(contentType)}, body: ${JSON.stringify(body)} },`;
    })
    .join('\n');

  return `export const adminAssets = {\n${entries}\n} as const;\n\nexport type AdminAssetPath = keyof typeof adminAssets;\n`;
}
