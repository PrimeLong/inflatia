/* Отчёт о чанках: какие модули лежат в чанке и сколько весят (сборка в память, dist не трогает).
   node scripts/chunk-report.mjs MacroSimulator,welcome — имена чанков через запятую. */
import { build } from 'vite';
const want = (process.argv[2] || 'MacroSimulator').split(',');
const res = await build({ logLevel: 'silent', build: { write: false } });
const out = Array.isArray(res) ? res[0].output : res.output;
for (const c of out) {
  if (c.type !== 'chunk' || !want.some((w) => c.fileName.includes(`/${w}-`))) continue;
  console.log(`== ${c.fileName} ${Math.round(c.code.length / 1024)} КБ; imports: ${c.imports.map((x) => x.split('/').pop().replace(/-[\w-]{8}\.js$/, '')).join(', ')}`);
  Object.entries(c.modules).map(([id, m]) => [m.renderedLength, id.replace(process.cwd(), '')]).sort((a, b) => b[0] - a[0]).slice(0, 30)
    .forEach(([n, id]) => console.log(`  ${String(Math.round(n / 1024)).padStart(4)} КБ ${id}`));
}
