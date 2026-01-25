import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { validateDoc } from './validator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_PATH = join(__dirname, '..', 'docs', 'architecture.txt');
const PORT = process.env.PORT || 3000;

const HTML = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Doc Validator</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui; max-width: 800px; margin: 40px auto; padding: 20px; background: #1a1a2e; color: #eee; }
    h1 { color: #00d9ff; }
    .score { font-size: 3em; font-weight: bold; }
    .good { color: #4ade80; }
    .warn { color: #fbbf24; }
    .bad { color: #f87171; }
    .section { padding: 8px; margin: 4px 0; border-radius: 4px; background: #16213e; }
    .found { border-left: 4px solid #4ade80; }
    .missing { border-left: 4px solid #f87171; }
    .rec { background: #1e3a5f; padding: 12px; margin: 8px 0; border-radius: 4px; }
    button { background: #00d9ff; border: none; padding: 12px 24px; cursor: pointer; border-radius: 4px; font-weight: bold; }
    button:hover { background: #00b8d9; }
  </style>
</head>
<body>
  <h1>📄 Doc Validator</h1>
  <button onclick="validate()">Проверить документацию</button>
  <div id="result"></div>
  <script>
    async function validate() {
      const res = await fetch('/api/validate');
      const data = await res.json();
      const scoreClass = data.score >= 8 ? 'good' : data.score >= 5 ? 'warn' : 'bad';

      document.getElementById('result').innerHTML = \`
        <p class="score \${scoreClass}">\${data.score}/10</p>
        <p><strong>\${data.summary}</strong></p>
        <h3>Секции:</h3>
        \${data.sections?.map(s =>
          \`<div class="section \${s.found ? 'found' : 'missing'}">\${s.found ? '✓' : '✗'} \${s.name}</div>\`
        ).join('') || ''}
        <h3>Рекомендации:</h3>
        \${data.recommendations?.map(r => \`<div class="rec">→ \${r}</div>\`).join('') || '<p>Нет рекомендаций</p>'}
      \`;
    }
  </script>
</body>
</html>`;

const server = createServer((req, res) => {
  if (req.url === '/api/validate') {
    res.setHeader('Content-Type', 'application/json');

    if (!existsSync(DOCS_PATH)) {
      res.end(JSON.stringify({ score: 0, error: 'Файл docs/architecture.txt не найден', recommendations: ['Создайте файл'] }));
      return;
    }

    const content = readFileSync(DOCS_PATH, 'utf-8');
    res.end(JSON.stringify(validateDoc(content)));
    return;
  }

  res.setHeader('Content-Type', 'text/html');
  res.end(HTML);
});

server.listen(PORT, () => {
  console.log(`🚀 Validator server: http://localhost:${PORT}`);
});
