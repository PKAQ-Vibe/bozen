// 生活习惯：seed + 家长自定义 + 每日勾选状态

import type { HabitDef, TaskInstance } from '@/models';
import habitsSeed from '@data/habits.json';
import { storage } from './storage';
import { getActiveProfileId } from './profileService';
import { getDayTasks, updateTask } from './taskService';
import { signTask } from './integrity';

const CUSTOM_KEY = 'habits.custom';
const DAY_KEY = (date: string) => `p.${getActiveProfileId()}.habits.done.${date}`;

export function getSeedHabits(): HabitDef[] {
  return habitsSeed as HabitDef[];
}
export function getCustomHabits(): HabitDef[] {
  return storage.get<HabitDef[]>(CUSTOM_KEY, []);
}
export function getAllHabits(): HabitDef[] {
  return [...getSeedHabits(), ...getCustomHabits()];
}
export function saveCustomHabit(h: HabitDef): void {
  const list = getCustomHabits();
  const idx = list.findIndex((x) => x.id === h.id);
  if (idx >= 0) list[idx] = h;
  else list.push(h);
  storage.set(CUSTOM_KEY, list);
}
export function deleteCustomHabit(id: string): void {
  storage.set(CUSTOM_KEY, getCustomHabits().filter((x) => x.id !== id));
}

/** 某日已完成的 habitId 列表（家长审核前状态） */
export function getHabitsDone(date: string): string[] {
  return storage.get<string[]>(DAY_KEY(date), []);
}
export function toggleHabitDone(date: string, habitId: string): string[] {
  const cur = new Set(getHabitsDone(date));
  if (cur.has(habitId)) cur.delete(habitId);
  else cur.add(habitId);
  const next = Array.from(cur);
  storage.set(DAY_KEY(date), next);
  syncHabitsTask(date);
  return next;
}

const HABIT_TASK_ID_PREFIX = 'habits-daily-';
const HABIT_TEMPLATE_ID = '__habit_daily__';

/** 生成或更新每日习惯汇总任务；status 保持 pending / in_progress 直到孩子主动提交 */
export function syncHabitsTask(date: string): TaskInstance | null {
  const habits = getAllHabits();
  if (habits.length === 0) return null;
  const doneIds = new Set(getHabitsDone(date));
  const doneHabits = habits.filter((h) => doneIds.has(h.id));
  const list = getDayTasks(date);
  const taskId = `${HABIT_TASK_ID_PREFIX}${date}`;
  const existing = list.find((t) => t.id === taskId);

  const basePoints = doneHabits.reduce((a, h) => a + h.points, 0);
  const standardMinutes = habits.length * 3; // 每个习惯预算 3 分
  const actualSeconds = doneHabits.length * 2 * 60; // 每个勾选记 2 分

  if (!existing) {
    const created: TaskInstance = {
      id: taskId,
      templateId: HABIT_TEMPLATE_ID,
      date,
      title: `今日生活习惯 ${doneHabits.length}/${habits.length}`,
      subject: 'habit',
      difficulty: 1,
      basePoints,
      standardMinutes,
      kind: 'required',
      description: doneHabits.map((h) => `${h.emoji} ${h.label}`).join('、') || '尚未勾选',
      status: 'pending',
      slackMinutes: 0,
      actualSeconds,
      pomodoros: 0,
      finishedInPomodoro: false,
    };
    created.sig = signTask({ id: created.id, actualSeconds: created.actualSeconds, pomodoros: 0 });
    updateTask(date, created);
    return created;
  }

  // 只在 pending / in_progress 时更新；已经审核了就别改
  if (existing.status !== 'pending' && existing.status !== 'in_progress') return existing;
  const next: TaskInstance = {
    ...existing,
    title: `今日生活习惯 ${doneHabits.length}/${habits.length}`,
    basePoints,
    standardMinutes,
    actualSeconds,
    description: doneHabits.map((h) => `${h.emoji} ${h.label}`).join('、') || '尚未勾选',
  };
  updateTask(date, next);
  return next;
}

/** 孩子主动提交今日习惯给家长审核 */
export function submitHabitsForReview(date: string): TaskInstance | null {
  const t = syncHabitsTask(date);
  if (!t) return null;
  if (t.status === 'approved' || t.status === 'awaiting_review') return t;
  const doneIds = new Set(getHabitsDone(date));
  if (doneIds.size === 0) return t;
  const next: TaskInstance = {
    ...t,
    status: 'awaiting_review',
    completedAt: Date.now(),
    finishedInPomodoro: false,
  };
  updateTask(date, next);
  return next;
}
