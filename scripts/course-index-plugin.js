/* УКАЗАТЕЛЬ КУРСА для Пути (virtual:course-index; src/learn/course-core.js): юниты и уроки без текстов глав —
   название, вид, порядок, минуты и опыт на билете. Считается из тех же глав тем же кодом курса
   (src/learn/course-index-build.js), поэтому Путь и урок не расходятся; сами главы в стартовые файлы не попадают.

   Как считается: поднимается отдельный сервер Vite без этого плагина (в нём указатель пуст — курс собирается из
   глав целиком), модуль указателя загружается в Node, результат подставляется готовыми данными. Так — и при сборке,
   и в разработке, и в тестах: один путь для всех. Результат запоминается на время жизни процесса; в разработке —
   пересчитывается, когда изменилась глава или код курса. */
import path from 'node:path';
import fs from 'node:fs';

const ID = 'virtual:course-index';
const ROOT = path.resolve(import.meta.dirname, '..');
const WATCH = ['src/textbook/chapters', 'src/textbook', 'src/learn'];

// отметка состояния исходников: самое позднее время изменения глав и модулей курса
function stamp() {
  let t = 0;
  WATCH.forEach((dir) => {
    const abs = path.join(ROOT, dir);
    fs.readdirSync(abs).forEach((f) => { const st = fs.statSync(path.join(abs, f)); if (st.isFile()) t = Math.max(t, st.mtimeMs); });
  });
  return t;
}

let cache = null; // { stamp, json }
export async function computeCourseIndex() {
  const now = stamp();
  if (cache && cache.stamp === now) return cache.json;
  const { createServer } = await import('vite');
  const { default: voiceFiles } = await import('./voice-files-plugin.js');
  const { default: textbookSections } = await import('./textbook-sections-plugin.js');
  // свой сервер: без конфигурации проекта (иначе этот плагин позвал бы сам себя); указатель в нём — пустой
  const server = await createServer({
    root: ROOT, configFile: false, logLevel: 'silent', appType: 'custom',
    server: { middlewareMode: true, ws: false, hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
    plugins: [textbookSections(), voiceFiles(), {
      name: 'course-index-empty',
      resolveId(id) { return id === ID ? `\0${ID}` : null; },
      load(id) { return id === `\0${ID}` ? 'export default null;' : null; },
    }],
  });
  try {
    const mod = await server.ssrLoadModule('/src/learn/course-index-build.js');
    const json = JSON.stringify(mod.buildCourseIndex());
    cache = { stamp: now, json };
    return json;
  } finally { await server.close(); }
}

export default function courseIndex() {
  return {
    name: 'course-index',
    resolveId(id) { return id === ID ? `\0${ID}` : null; },
    async load(id) {
      if (id !== `\0${ID}`) return null;
      WATCH.forEach((dir) => fs.readdirSync(path.join(ROOT, dir)).forEach((f) => this.addWatchFile(path.join(ROOT, dir, f))));
      return `export default ${await computeCourseIndex()};`;
    },
  };
}
