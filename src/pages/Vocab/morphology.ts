// 简单启发式：把英文单词切成 prefix / root / suffix 段，用于卡片高亮
// 只匹配初中常见词缀，遇到组合词/短语原样返回。

export type WordPart = { text: string; kind: 'prefix' | 'root' | 'suffix' };

const PREFIXES = [
  'anti', 'auto', 'counter', 'inter', 'micro', 'multi', 'over', 'semi',
  'super', 'trans', 'ultra', 'under',
  'dis', 'mis', 'non', 'pre', 'pro', 'sub', 'out', 'con', 'com',
  're', 'un', 'in', 'im', 'il', 'ir', 'ex', 'en', 'em', 'up',
];

const SUFFIXES = [
  'ation', 'ition', 'ness', 'ment', 'able', 'ible', 'ship', 'hood',
  'less', 'ful', 'ous', 'ive', 'ize', 'ise', 'ify', 'ical', 'ance', 'ence',
  'tion', 'sion', 'ally', 'ling',
  'ing', 'ed', 'ly', 'er', 'est', 'or', 'al', 'ic', 'ty',
];

/** 词根最短保留 3 字母 · 多词短语/含空格连字符者原样一段 */
export function splitWord(en: string): WordPart[] {
  const trimmed = en.trim();
  if (!trimmed) return [];
  if (/\s|-/.test(trimmed)) return [{ text: trimmed, kind: 'root' }];

  const lower = trimmed.toLowerCase();
  let prefix = '';
  let suffix = '';
  let core = lower;

  // 前缀（longest first）
  for (const p of [...PREFIXES].sort((a, b) => b.length - a.length)) {
    if (lower.startsWith(p) && lower.length - p.length >= 3) {
      prefix = p;
      core = lower.slice(p.length);
      break;
    }
  }

  // 后缀（longest first）
  for (const s of [...SUFFIXES].sort((a, b) => b.length - a.length)) {
    if (core.endsWith(s) && core.length - s.length >= 3) {
      suffix = s;
      core = core.slice(0, core.length - s.length);
      break;
    }
  }

  const parts: WordPart[] = [];
  let cursor = 0;
  if (prefix) {
    parts.push({ text: trimmed.slice(cursor, cursor + prefix.length), kind: 'prefix' });
    cursor += prefix.length;
  }
  parts.push({ text: trimmed.slice(cursor, cursor + core.length), kind: 'root' });
  cursor += core.length;
  if (suffix) {
    parts.push({ text: trimmed.slice(cursor, cursor + suffix.length), kind: 'suffix' });
  }
  return parts;
}
