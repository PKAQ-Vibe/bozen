// 词汇服务：单元列表（seed + 家长自定义）+ 复背进度管理

import type { VocabUnit, VocabWord, WordProgress } from '@/models';
import { isDueToday, nextDueAt } from '@/models';
import seedUnits from '@data/english-vocab.json';
import { storage } from './storage';
import { getActiveProfileId } from './profileService';

const CUSTOM_UNITS_KEY = 'vocab.units.custom';
const PROGRESS_KEY = () => `p.${getActiveProfileId()}.vocab.progress`;

export function getSeedUnits(): VocabUnit[] {
  return seedUnits as VocabUnit[];
}
export function getCustomUnits(): VocabUnit[] {
  return storage.get<VocabUnit[]>(CUSTOM_UNITS_KEY, []);
}
export function getAllUnits(): VocabUnit[] {
  const custom = getCustomUnits();
  const seed = getSeedUnits();
  // custom 单元优先覆盖同 id 的 seed
  const map = new Map<string, VocabUnit>();
  for (const u of seed) map.set(u.id, u);
  for (const u of custom) map.set(u.id, u);
  return Array.from(map.values());
}
export function getUnit(id: string): VocabUnit | undefined {
  return getAllUnits().find((u) => u.id === id);
}
export function saveCustomUnit(unit: VocabUnit): void {
  const list = getCustomUnits();
  const idx = list.findIndex((u) => u.id === unit.id);
  if (idx >= 0) list[idx] = unit;
  else list.push(unit);
  storage.set(CUSTOM_UNITS_KEY, list);
}
export function deleteCustomUnit(id: string): void {
  storage.set(CUSTOM_UNITS_KEY, getCustomUnits().filter((u) => u.id !== id));
}

/** 从文本粘贴中解析：每行 "en [pos]  zh" 或 "en, zh" 或 "en\tzh" */
export function parseWordText(input: string): VocabWord[] {
  const rows = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const words: VocabWord[] = [];
  for (const line of rows) {
    // 支持分隔符：制表符 · 中英文逗号 · 双空格 · 冒号 · | · => · -
    const parts = line.split(/\t|,|，|:|：|\|| {2,}| — | – | => | -> | -\s/).map((s) => s.trim()).filter(Boolean);
    if (parts.length < 2) continue;
    const en = parts[0];
    let pos: string | undefined;
    let zh = parts.slice(1).join(' ');
    // 尝试从 en 里剥离词性 "(n.)" 或 "n." 前缀
    const posMatch = en.match(/^([a-z]+\.)$/i);
    if (posMatch) continue;
    const zhWithPos = zh.match(/^(([a-z]+\.))\s*(.+)$/i);
    if (zhWithPos) {
      pos = zhWithPos[1];
      zh = zhWithPos[3];
    }
    if (!en || !zh) continue;
    const slug = en.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    words.push({ id: `w-${slug}-${words.length}`, en, zh, pos });
  }
  return words;
}

/* ───────── 复背进度 ───────── */

export function getAllProgress(): Record<string, WordProgress> {
  return storage.get<Record<string, WordProgress>>(PROGRESS_KEY(), {});
}
export function getWordProgress(wordId: string): WordProgress {
  return getAllProgress()[wordId] ?? { wordId, round: 0, correctCount: 0, wrongCount: 0 };
}

/** 记录一次背诵结果，推进 round 或不推进 */
export function recordReview(wordId: string, correct: boolean): WordProgress {
  const map = getAllProgress();
  const cur = map[wordId] ?? { wordId, round: 0, correctCount: 0, wrongCount: 0 };
  const now = Date.now();
  const nextRound = correct ? cur.round + 1 : Math.max(0, cur.round - 1); // 错了退一步
  const due = nextDueAt(nextRound, now);
  const next: WordProgress = {
    ...cur,
    round: nextRound,
    lastReviewedAt: now,
    dueAt: due,
    correctCount: cur.correctCount + (correct ? 1 : 0),
    wrongCount: cur.wrongCount + (correct ? 0 : 1),
  };
  map[wordId] = next;
  storage.set(PROGRESS_KEY(), map);
  return next;
}

export function resetProgress(wordId: string): void {
  const map = getAllProgress();
  delete map[wordId];
  storage.set(PROGRESS_KEY(), map);
}

/** 当日 due 单词：新单词 + 到期复背 */
export function getDueToday(unitId?: string): VocabWord[] {
  const units = unitId ? [getUnit(unitId)].filter(Boolean) as VocabUnit[] : getAllUnits();
  const progress = getAllProgress();
  const words: VocabWord[] = [];
  for (const u of units) {
    for (const w of u.words) {
      const p = progress[w.id] ?? { wordId: w.id, round: 0, correctCount: 0, wrongCount: 0 };
      if (isDueToday(p)) words.push(w);
    }
  }
  return words;
}

/** 单元统计：新 / 复习 / 已毕业 */
export function getUnitStats(unitId: string): {
  total: number;
  fresh: number;
  reviewing: number;
  graduated: number;
  dueToday: number;
} {
  const u = getUnit(unitId);
  if (!u) return { total: 0, fresh: 0, reviewing: 0, graduated: 0, dueToday: 0 };
  const progress = getAllProgress();
  let fresh = 0, reviewing = 0, graduated = 0, dueToday = 0;
  for (const w of u.words) {
    const p = progress[w.id] ?? { wordId: w.id, round: 0, correctCount: 0, wrongCount: 0 };
    if (p.round === 0) fresh += 1;
    else if (p.round >= 6) graduated += 1;
    else reviewing += 1;
    if (isDueToday(p)) dueToday += 1;
  }
  return { total: u.words.length, fresh, reviewing, graduated, dueToday };
}
