import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { TRACKS } from '../tracks.js';

// пункт владельца 15.11: «давай описание под все остальные треки» — у каждой пьесы саундтрека есть строка для Suno
describe('music/README.md: описание каждой пьесы', () => {
  const md = readFileSync(new URL('../../../music/README.md', import.meta.url), 'utf8');
  it.each(Object.keys(TRACKS))('%s — строка с файлом, названием и стилем', (id) => {
    const row = md.split('\n').find((l) => l.startsWith(`| \`${id}.mp3\``));
    expect(row, id).toBeTruthy();
    expect(row).toContain(`«${TRACKS[id].name}»`);
    expect(row).toMatch(/`instrumental, [^`]+\d+ bpm[^`]*`/);
    // темп в описании — как у синтезированной пьесы
    expect(row).toContain(`${TRACKS[id].bpm} bpm`);
  });
});
