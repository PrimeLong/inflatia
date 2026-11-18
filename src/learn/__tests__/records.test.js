/* Пластинки лавки (замечание владельца 18.11, вечер, п. 4: «нужны платные пластинки в лавке, какие-то прям афигенные треки;
   генерацию не делать — я сам сгенерирую по твоему описанию»). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { RECORDS } from '../../audio/records.js';
import { TRACKS, MOOD_PLAYLISTS, MOOD_LABEL } from '../../audio/tracks.js';
import { createAudioEngine } from '../../audio/engine.js';
import { OUTFITS, OUTFIT_BY_ID, RECORD_ITEMS, WARDROBE, ownedRecordTracks, shopDay, buy, earn, courseIncome, RATE_MAX } from '../rewards.js';
import { emptyLearn, dayOf } from '../../textbook/learn-state.js';
import { recordsFor } from '../../learn-shop.jsx';

const T = Date.UTC(2026, 10, 18, 12);

describe('пластинки лавки', () => {
  it('шесть пластинок: своя пьеса-запись, редкая вещь, дороже вещей Инфли, но по силам за курс; не в гардеробе', () => {
    expect(RECORD_ITEMS).toHaveLength(RECORDS.length);
    expect(RECORDS.length).toBeGreaterThanOrEqual(6);
    const wardrobeMax = Math.max(...WARDROBE.map((o) => o.crowns));
    for (const id of RECORD_ITEMS) {
      const o = OUTFIT_BY_ID[id];
      expect(o.slot).toBe('record'); expect(o.rare).toBe(true);
      expect(TRACKS[o.track].mood).toBe('records');
      expect(o.crowns).toBeGreaterThan(wardrobeMax);
      expect(Math.ceil(o.crowns * RATE_MAX)).toBeLessThanOrEqual(0.7 * courseIncome().total);
    }
    expect(WARDROBE.some((o) => o.slot === 'record')).toBe(false);
    expect(shopDay(emptyLearn(), dayOf(T)).records).toEqual(RECORD_ITEMS);
  });
  it('в продаже только пластинки, чья запись уже лежит в public/music', () => {
    expect(recordsFor(RECORD_ITEMS, new Set())).toEqual([]);
    const one = OUTFIT_BY_ID[RECORD_ITEMS[0]].track;
    expect(recordsFor(RECORD_ITEMS, new Set([one, 'dawn']))).toEqual([RECORD_ITEMS[0]]);
  });
  it('купили — пьеса в миксе «Пластинки»; в «Волну» и музыку «Мира» пластинки не входят', () => {
    const rich = earn(emptyLearn(), 50000, null, T);
    const r = buy(rich, RECORD_ITEMS[1], T);
    expect(r.ok).toBe(true);
    expect(ownedRecordTracks(r.s)).toEqual([OUTFIT_BY_ID[RECORD_ITEMS[1]].track]);
    const a = createAudioEngine();
    a.setRecords(ownedRecordTracks(r.s));
    a.setPlaylist('records');
    expect(a.playlist().map((p) => p.id)).toEqual(ownedRecordTracks(r.s));
    expect(MOOD_LABEL.records).toBe('Пластинки');
    for (const id of RECORD_ITEMS.map((x) => OUTFIT_BY_ID[x].track)) {
      expect(MOOD_PLAYLISTS.wave).not.toContain(id);
      for (const m of ['calm', 'boom', 'slump', 'crisis', 'war']) expect(MOOD_PLAYLISTS[m]).not.toContain(id);
    }
  });
  it('у каждой пластинки — описание для генерации в music/README.md: стиль, темп, что должно получиться', () => {
    const md = readFileSync(new URL('../../../music/README.md', import.meta.url), 'utf8');
    const part = md.slice(md.indexOf('## Пластинки лавки'));
    for (const r of RECORDS) {
      const row = part.split('\n').find((l) => l.startsWith(`| \`${r.track}.mp3\``));
      expect(row, r.track).toBeTruthy();
      expect(row).toContain(`«${r.name}»`); expect(row).toContain(`${r.bpm} bpm`);
    }
    expect(OUTFITS.filter((o) => o.slot === 'record')).toHaveLength(RECORDS.length);
  });
});
