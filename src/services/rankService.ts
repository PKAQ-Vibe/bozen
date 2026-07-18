// 段位晋升（§十一 联赛体系 · 商城 RankCard）
// 6 段位：社区 → 城市 → 职业 → 超级 → 欧冠 → 金球

export interface Rank {
  key: string;
  label: string;
  minPoints: number;
  emoji: string;
}

export const RANKS: Rank[] = [
  { key: 'community', label: '社区联赛', minPoints: 0, emoji: '🏘' },
  { key: 'city',      label: '城市联赛', minPoints: 800, emoji: '🥈' },
  { key: 'pro',       label: '职业联赛', minPoints: 3000, emoji: '🥇' },
  { key: 'super',     label: '超级联赛', minPoints: 6000, emoji: '🏆' },
  { key: 'champions', label: '欧冠联赛', minPoints: 10000, emoji: '🌟' },
  { key: 'ballon',    label: '金球奖',   minPoints: 15000, emoji: '👑' },
];

export function getRankByPoints(points: number): Rank {
  let cur = RANKS[0];
  for (const r of RANKS) if (points >= r.minPoints) cur = r;
  return cur;
}

export function getNextRank(points: number): Rank | null {
  return RANKS.find((r) => r.minPoints > points) ?? null;
}
