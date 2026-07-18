// 词汇 · 单元 · 复背计划模型
// 记忆曲线：D0（学习） → D1 → D2 → D4 → D7 → D14 → D30（艾宾浩斯简化版）

export interface VocabWord {
  /** 稳定 id：unitId + slug */
  id: string;
  /** 英文 */
  en: string;
  /** 中文释义 */
  zh: string;
  /** 词性简写：n. v. adj. adv. prep. conj. phr. */
  pos?: string;
  /** 例句（可选） */
  example?: string;
}

export interface VocabUnit {
  id: string;
  /** 显示序号：如 "Unit 1" */
  no: string;
  /** 单元主题 */
  title: string;
  /** 教材来源（用于关联 PDF） */
  book: 'english-8up-lujiao' | 'english-8up-custom';
  /** 教材页码区间（可选） */
  pageRange?: string;
  words: VocabWord[];
}

/** 复背轮次间隔（天） · 艾宾浩斯简化：越背越稀 */
export const REVIEW_INTERVALS: number[] = [1, 2, 4, 7, 14, 30];

/** 每个单词的复背状态 */
export interface WordProgress {
  wordId: string;
  /** 已完成轮次数（0 = 未开始，6 = 已"毕业"） */
  round: number;
  /** 上次背诵时间 */
  lastReviewedAt?: number;
  /** 下次到期时间戳（进入日 due 列表的判据） */
  dueAt?: number;
  /** 累计正确次数 */
  correctCount: number;
  /** 累计错误次数 */
  wrongCount: number;
}

/** 计算下一轮到期时间
 *  round 为「刚完成的轮次编号」（1 起）：
 *   刚完成 round 1 → +1 天（D1）
 *   刚完成 round 2 → +2 天
 *   ...
 *   刚完成 round 6（最后一轮）→ 毕业，返回 undefined
 */
export function nextDueAt(round: number, from = Date.now()): number | undefined {
  const idx = round - 1;
  if (idx < 0 || idx >= REVIEW_INTERVALS.length) return undefined; // 毕业或无效
  const days = REVIEW_INTERVALS[idx];
  return from + days * 86_400_000;
}

/** 一个词是否今日 due */
export function isDueToday(p: WordProgress, now = Date.now()): boolean {
  if (p.round === 0) return true; // 新词永远 due
  if (p.dueAt == null) return false;
  return p.dueAt <= now;
}
