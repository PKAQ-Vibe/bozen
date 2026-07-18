// 限时挑战服务：seed + 家长发布 + 达成计算
// §七 7.2 · 到期不负债、不入积分

import type { Challenge, TaskInstance } from '@/models';
import { storage } from './storage';
import { scanAllDayTasks } from './statsService';
import seedChallenges from '@data/challenges.json';

const KEY_CUSTOM = 'challenges.custom';
const KEY_ACHIEVED = 'challenges.achieved';

export function getSeedChallenges(): Challenge[] {
  return seedChallenges as Challenge[];
}

export function getCustomChallenges(): Challenge[] {
  return storage.get<Challenge[]>(KEY_CUSTOM, []);
}

export function saveCustomChallenge(ch: Challenge): void {
  const list = getCustomChallenges();
  const idx = list.findIndex((c) => c.id === ch.id);
  if (idx >= 0) list[idx] = ch;
  else list.push(ch);
  storage.set(KEY_CUSTOM, list);
}

export function deleteCustomChallenge(id: string): void {
  storage.set(KEY_CUSTOM, getCustomChallenges().filter((c) => c.id !== id));
}

/** 获取当前生效的挑战（未过期 + 未达成的置顶） */
export function getActiveChallenges(now = Date.now()): Challenge[] {
  const all = [...getSeedChallenges(), ...getCustomChallenges()];
  return all.filter((c) => c.endAt > now);
}

/** 用挑战窗口内所有已通过的 challenge 任务计算进度；鼓励"主动加做" */
export function computeChallengeProgress(
  challenge: Challenge,
  todayTasks?: TaskInstance[],
): { progress: number; achieved: boolean } {
  const all = scanAllDayTasks();
  const flat: TaskInstance[] = Object.values(all).flat();
  const merged = todayTasks
    ? [...flat.filter((t) => !todayTasks.some((tt) => tt.id === t.id)), ...todayTasks]
    : flat;
  const doneCount = merged.filter(
    (t) =>
      t.kind === 'challenge' &&
      t.status === 'approved' &&
      t.completedAt != null &&
      t.completedAt >= challenge.startAt &&
      t.completedAt <= challenge.endAt,
  ).length;
  const achieved = doneCount >= challenge.targetTaskCount;
  return { progress: Math.min(doneCount, challenge.targetTaskCount), achieved };
}

/** 标记挑战已达成（本地一次性），返回是否首次 */
export function markAchieved(id: string): boolean {
  const set = new Set(storage.get<string[]>(KEY_ACHIEVED, []));
  if (set.has(id)) return false;
  set.add(id);
  storage.set(KEY_ACHIEVED, Array.from(set));
  return true;
}

export function isAchieved(id: string): boolean {
  return storage.get<string[]>(KEY_ACHIEVED, []).includes(id);
}
