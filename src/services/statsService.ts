// 从本地加密存储反查历史数据的统计函数
// 用于首页连续打卡、暑假作业进度、日历每日状态

import type { TaskInstance } from '@/models';
import { storage } from './storage';
import { getActiveProfileId } from './profileService';

/** 扫盘拿到某个 profile 的所有 tasks.byDay.* 数据 */
export function scanAllDayTasks(profileId?: string): Record<string, TaskInstance[]> {
  const pid = profileId ?? getActiveProfileId();
  const pattern = `p.${pid}.tasks.byDay.`;
  const out: Record<string, TaskInstance[]> = {};
  for (const [key, value] of storage.entries(pattern)) {
    if (Array.isArray(value)) out[key.slice(pattern.length)] = value as TaskInstance[];
  }
  return out;
}

/** 某日期是否算「打卡成功」= 至少 1 个 approved 任务 */
export function isDayCheckedIn(date: string): boolean {
  const list = storage.get<TaskInstance[] | null>(`p.${getActiveProfileId()}.tasks.byDay.${date}`, null);
  if (!list) return false;
  return list.some((t) => t.status === 'approved');
}

function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 连续打卡天数：从 today 或 yesterday（今天没打）倒推 */
export function getStreakDays(todayIso: string): number {
  const today = new Date(todayIso);
  let count = 0;
  const cursor = new Date(today);

  // 如果今天没打卡，从昨天开始数（一天没打不清 streak，为了给孩子留缓冲）
  if (!isDayCheckedIn(fmt(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!isDayCheckedIn(fmt(cursor))) return 0;
  }

  while (isDayCheckedIn(fmt(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
    if (count > 365) break; // 保护
  }
  return count;
}

/** 本月总打卡天数（月历 stat 用） */
export function getMonthCheckIns(anchor: Date): number {
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const days = new Date(y, m + 1, 0).getDate();
  let count = 0;
  for (let d = 1; d <= days; d++) {
    if (isDayCheckedIn(fmt(new Date(y, m, d)))) count += 1;
  }
  return count;
}

/** 本月已入账积分 */
export function getMonthPoints(anchor: Date): number {
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const all = scanAllDayTasks();
  let sum = 0;
  for (const [date, tasks] of Object.entries(all)) {
    const d = new Date(date);
    if (d.getFullYear() !== y || d.getMonth() !== m) continue;
    for (const t of tasks) if (t.status === 'approved') sum += t.awardedPoints ?? 0;
  }
  return sum;
}

/** 按学科聚合暑假作业进度：{ subject: { done, total } }
 *  逻辑：跨越所有已扫到的日子 → 每学科的 approved / (approved + pending + in_progress + awaiting_review + rejected) */
export function getSubjectProgress(): Record<string, { done: number; total: number; pct: number }> {
  const all = scanAllDayTasks();
  const map: Record<string, { done: number; total: number }> = {};
  for (const tasks of Object.values(all)) {
    for (const t of tasks) {
      const key = t.subject;
      if (!map[key]) map[key] = { done: 0, total: 0 };
      map[key].total += 1;
      if (t.status === 'approved') map[key].done += 1;
    }
  }
  const out: Record<string, { done: number; total: number; pct: number }> = {};
  for (const [k, v] of Object.entries(map)) {
    out[k] = { ...v, pct: v.total > 0 ? Math.round((v.done / v.total) * 100) : 0 };
  }
  return out;
}

/** 本周已入账积分（对齐周一） */
export function getWeekPoints(anchor: Date = new Date()): number {
  const day = anchor.getDay() === 0 ? 7 : anchor.getDay();
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() - (day - 1));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const all = scanAllDayTasks();
  let sum = 0;
  for (const [date, tasks] of Object.entries(all)) {
    const d = new Date(date);
    if (d < monday || d > sunday) continue;
    for (const t of tasks) if (t.status === 'approved') sum += t.awardedPoints ?? 0;
  }
  return sum;
}

/** 本周达成个数（供限时挑战判断） */
export function getWeekApprovedCount(): number {
  const all = scanAllDayTasks();
  const monday = new Date();
  const day = monday.getDay() === 0 ? 7 : monday.getDay();
  monday.setDate(monday.getDate() - (day - 1));
  monday.setHours(0, 0, 0, 0);
  let cnt = 0;
  for (const [date, tasks] of Object.entries(all)) {
    if (new Date(date) < monday) continue;
    cnt += tasks.filter((t) => t.status === 'approved').length;
  }
  return cnt;
}

/** 总 approved 任务数（技能点用） */
export function getTotalApproved(): number {
  const all = scanAllDayTasks();
  let cnt = 0;
  for (const tasks of Object.values(all)) cnt += tasks.filter((t) => t.status === 'approved').length;
  return cnt;
}
