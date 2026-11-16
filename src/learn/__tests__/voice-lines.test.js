import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { voiceId, ttsText, voiceLines, hasRecording, anyRecordings, recordingUrl, wordAt } from '../voice-lines.js';
import VOICE_FILES from 'virtual:voice-files';
import { voiceCaption } from '../voices.js';
import { LESSONS } from '../course.js';
import { plainText } from '../../textbook/content.js';
import { DEFAULT_VOICE } from '../cast.js';
import { listVoiceFiles } from '../../../scripts/voice-files-plugin.js';
import { renderServiceWorker } from '../../../scripts/sw-plugin.js';

describe('записанные голоса', () => {
  it('имя записи: герой и 7 знаков от текста; пробелы не меняют имя, правка текста — меняет', () => {
    const id = voiceId('host', 'Доброе утро, Велеград!');
    expect(id).toMatch(/^host-[0-9a-z]{7}$/);
    expect(voiceId('host', '  Доброе   утро,\nВелеград! ')).toBe(id);
    expect(voiceId('host', 'Доброе утро, Велеград.')).not.toBe(id);
    expect(voiceId('masha', 'Доброе утро, Велеград!')).not.toBe(id);
  });

  it('текст для сервиса озвучки: разряды склеены, «кр.» — «крон», без знаков ударения', () => {
    // числа — словами (пункт владельца 15.11: «не 9, а девять»)
    expect(ttsText('Стоит 10 000 кр. за 5 батонов')).toBe('Стоит десять тысяч крон за пять батонов');
  });

  it('в эфире без формул: в тексте сюжета нет знаков TeX — ни на экране, ни в голосе (жалоба mvuagpq0)', () => {
    voiceLines(LESSONS, plainText, DEFAULT_VOICE.listen).forEach((l) => expect(l.text, `${l.lesson}: ${l.text}`).not.toMatch(/[{}\\^_$]/));
  });

  it('реплики — все сюжеты эфиров «Слушай», без повторов и с разными именами', () => {
    const lines = voiceLines(LESSONS, plainText, DEFAULT_VOICE.listen);
    const listen = LESSONS.filter((l) => l.kind === 'listen');
    expect(lines.length).toBeGreaterThan(0);
    expect(new Set(lines.map((l) => l.lesson)).size).toBe(listen.length);
    expect(new Set(lines.map((l) => l.id)).size).toBe(lines.length);
    lines.forEach((l) => {
      expect(l.text).not.toBe('');
      expect(l.id).toBe(voiceId(l.who, l.text));
      // реплика в ленте — тот же текст, что и в выгрузке: урок найдёт свою запись
      const lesson = listen.find((x) => x.id === l.lesson);
      expect(lesson.inner.some((c) => voiceId(c.idea.who || DEFAULT_VOICE.listen, plainText(c.idea.text)) === l.id)).toBe(true);
    });
    // «История» — лента для чтения: её реплики не выгружаются
    const story = LESSONS.find((l) => l.kind === 'story');
    expect(lines.some((l) => l.lesson === story.id)).toBe(false);
  });

  it('запись есть — играет она, нет — голос браузера; подпись под эфиром — про браузер или про синтез', () => {
    expect(anyRecordings()).toBe(VOICE_FILES.length > 0);
    VOICE_FILES.forEach((id) => expect(hasRecording(id)).toBe(true));
    expect(hasRecording(voiceId('host', 'такой реплики в курсе нет'))).toBe(false);
    expect(recordingUrl('host-0abc123')).toBe('/voice/host-0abc123.mp3');
    expect(voiceCaption(false)).toBe('голос синтезирован браузером');
    expect(voiceCaption(true)).toBe('голос синтезирован');
  });

  it('подсветка слова под записью — по доле прослушанного', () => {
    const starts = [0, 6, 12, 20];
    expect(wordAt(starts, 26, 0)).toBe(0);
    expect(wordAt(starts, 26, 0.5)).toBe(2);
    expect(wordAt(starts, 26, 1)).toBe(3);
    expect(wordAt(starts, 26, 7)).toBe(3);
  });

  it('список записей — MP3 из папки, по имени без расширения; нет папки — пусто', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'voice-'));
    ['host-0abc123.mp3', 'host-1zzz999.MP3', 'notes.txt'].forEach((f) => fs.writeFileSync(path.join(dir, f), ''));
    expect(listVoiceFiles(dir)).toEqual(['host-0abc123', 'host-1zzz999']);
    expect(listVoiceFiles(path.join(dir, 'нет'))).toEqual([]);
  });

  it('service worker не трогает записи голосов, книг и пьес саундтрека: их отдаёт сеть', () => {
    expect(renderServiceWorker([])).toContain("if (url.pathname.startsWith('/voice/') || url.pathname.startsWith('/books/') || url.pathname.startsWith('/music/')) return;");
  });
});

describe('озвучка: числа и знаки словами (пункт владельца 15.11)', () => {
  it('падеж по предлогу, род по слову после, проценты, дроби, тысячи, знаки', async () => {
    const { sayNumbers, cardinal, pluralRu } = await import('../say-numbers.js');
    const cases = [
      ['с 4 до 6%', 'с четырёх до шести процентов'],
      ['на 1%', 'на один процент'],
      ['на 8,7%', 'на восемь целых семь десятых процента'],
      ['в 1,12 раза', 'в одну целую двенадцать сотых раза'],
      ['1,12 / 1,03 ≈ 1,087', 'одна целая двенадцать сотых делить на одну целую три сотых — примерно одна целая восемьдесят семь тысячных'],
      ['2 кроны', 'две кроны'], ['за 1 крону', 'за одну крону'], ['21 бутылка', 'двадцать одна бутылка'],
      ['со 100 до 80 тысяч', 'со ста до восьмидесяти тысяч'], ['вместо 50.', 'вместо пятидесяти.'],
      ['на 100 млн крон', 'на сто миллионов крон'], ['50 000 батонов', 'пятьдесят тысяч батонов'], ['— 1500.', '— тысяча пятьсот.'],
      ['с 10000 до 10700 крон', 'с десяти тысяч до десяти тысяч семисот крон'], ['плюс по 0,2 кроны', 'плюс по ноль целых две десятых кроны'],
    ];
    cases.forEach(([a, b]) => expect(sayNumbers(a), a).toBe(b));
    expect(cardinal(2_345_678)).toBe('два миллиона триста сорок пять тысяч шестьсот семьдесят восемь');
    expect(pluralRu(11, 'a', 'b', 'c')).toBe('c'); expect(pluralRu(22, 'a', 'b', 'c')).toBe('b');
  });
  it('в текстах для озвучки всех сюжетов не осталось цифр', async () => {
    const { readFileSync } = await import('node:fs');
    const rows = readFileSync(new URL('../../../voice/lines.csv', import.meta.url), 'utf8').split('\n').slice(1).filter(Boolean);
    expect(rows.length).toBeGreaterThan(50);
    rows.forEach((r) => expect(r.split(';').slice(5).join(';'), r.slice(0, 20)).not.toMatch(/\d/));
  });
});
