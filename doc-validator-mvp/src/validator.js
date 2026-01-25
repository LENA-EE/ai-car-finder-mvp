import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_PATH = join(__dirname, '..', 'docs', 'architecture.txt');
const REPORT_PATH = join(__dirname, '..', 'docs', 'validation-report.md');

// Критические секции для AI-агентов (гибкие паттерны)
const CRITICAL_SECTIONS = [
  { pattern: /(overview|обзор|scope|цел[иь]|product\s*scope)/i, name: 'Overview', weight: 1 },
  { pattern: /(api\s*(contract|spec|endpoint)|endpoints?|эндпоинт|rest\s*api)/i, name: 'API Endpoints', weight: 2 },
  { pattern: /(data\s*model|domain\s*model|модел|schema|схема|er-?diagram|aggregat)/i, name: 'Data Model', weight: 2 },
  { pattern: /(auth|аутентификац|безопасност|security|jwt|rbac)/i, name: 'Authentication', weight: 1.5 },
  { pattern: /(error\s*(handling|case|response)|ошибк|exception|validation)/i, name: 'Error Handling', weight: 1 },
  { pattern: /(example|пример|usage|few-?shot|тестов)/i, name: 'Examples', weight: 1.5 },
  { pattern: /(dependenc|зависимост|stack|стек|технолог)/i, name: 'Dependencies', weight: 1 },
  { pattern: /(deploy|развертыван|install|установк|infrastructure|railway|ci\/cd)/i, name: 'Deployment', weight: 1 },
];

export function validateDoc(content) {
  const results = {
    score: 0,
    maxScore: 10,
    sections: [],
    recommendations: [],
    summary: ''
  };

  if (!content || content.trim().length === 0) {
    results.recommendations.push('Документация пуста. Добавьте содержимое.');
    results.summary = 'Документация отсутствует';
    return results;
  }

  let totalWeight = 0;
  let foundWeight = 0;

  for (const section of CRITICAL_SECTIONS) {
    totalWeight += section.weight;
    const found = section.pattern.test(content);

    results.sections.push({
      name: section.name,
      found,
      weight: section.weight
    });

    if (found) {
      foundWeight += section.weight;
    } else {
      results.recommendations.push(`Добавьте секцию: ${section.name}`);
    }
  }

  // Дополнительные проверки
  const lines = content.split('\n').length;
  const codeBlocks = (content.match(/```/g) || []).length / 2;
  // Также считаем inline-код: python, sql, typescript, json, bash и т.д.
  const inlineCodeBlocks = (content.match(/\b(python|sql|typescript|javascript|json|bash|text)\s*\n/gi) || []).length;
  const totalCodeBlocks = codeBlocks + inlineCodeBlocks;

  if (lines < 20) {
    results.recommendations.push('Документация слишком короткая (< 20 строк)');
  }

  if (totalCodeBlocks < 1) {
    results.recommendations.push('Добавьте примеры кода в блоках ```');
  }

  // Расчет score
  const sectionScore = (foundWeight / totalWeight) * 7;
  const lengthScore = Math.min(lines / 100, 1.5);
  const codeScore = Math.min(totalCodeBlocks * 0.3, 1.5);

  results.score = Math.min(10, Math.round((sectionScore + lengthScore + codeScore) * 10) / 10);

  // Summary
  if (results.score >= 8) {
    results.summary = 'Отличная документация для AI-агентов';
  } else if (results.score >= 5) {
    results.summary = 'Документация требует доработки';
  } else {
    results.summary = 'Критически недостаточная документация';
  }

  return results;
}

// Генерация Markdown отчёта
export function generateReport(result) {
  const date = new Date().toISOString().split('T')[0];
  const time = new Date().toLocaleTimeString('ru-RU');

  const scoreEmoji = result.score >= 8 ? '🟢' : result.score >= 5 ? '🟡' : '🔴';
  const statusBadge = result.score >= 8 ? '![Status](https://img.shields.io/badge/Status-PASSED-green)'
                    : result.score >= 5 ? '![Status](https://img.shields.io/badge/Status-WARNING-yellow)'
                    : '![Status](https://img.shields.io/badge/Status-FAILED-red)';

  let md = `# Validation Report

${statusBadge}

**Дата:** ${date}
**Время:** ${time}

---

## Результат

| Метрика | Значение |
|---------|----------|
| Score | ${scoreEmoji} **${result.score}/${result.maxScore}** |
| Статус | ${result.summary} |

---

## Секции документации

| Секция | Статус | Вес |
|--------|--------|-----|
`;

  for (const section of result.sections) {
    const status = section.found ? '✅' : '❌';
    md += `| ${section.name} | ${status} | ${section.weight} |\n`;
  }

  md += `\n---\n\n## Рекомендации\n\n`;

  if (result.recommendations.length === 0) {
    md += `> ✅ Все критические секции присутствуют. Документация готова для AI-агентов.\n`;
  } else {
    for (const rec of result.recommendations) {
      md += `- ⚠️ ${rec}\n`;
    }
  }

  md += `\n---\n\n## JSON (для интеграции)\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\`\n`;

  return md;
}

// CLI режим
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('\n📄 Doc Validator MVP\n');

  if (!existsSync(DOCS_PATH)) {
    console.log(JSON.stringify({
      error: `Файл не найден: ${DOCS_PATH}`,
      score: 0,
      recommendations: ['Создайте файл docs/architecture.txt']
    }, null, 2));
    process.exit(1);
  }

  const content = readFileSync(DOCS_PATH, 'utf-8');
  const result = validateDoc(content);

  // Генерация и сохранение MD отчёта
  const report = generateReport(result);
  writeFileSync(REPORT_PATH, report, 'utf-8');

  console.log(JSON.stringify(result, null, 2));
  console.log(`\n📝 Отчёт сохранён: docs/validation-report.md`);

  process.exit(result.score >= 5 ? 0 : 1);
}
