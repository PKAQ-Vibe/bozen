// 任务服务：负责把模板膨胀为「当日实例」，并持久化运行时态。
// Pro 迁移点：把 storage 读写换成 HTTP 即可，函数签名保持不变。

import type { TaskInstance, TaskStatus, TaskTemplate } from '@/models';
import { seedTaskTemplates } from './seed';
import { storage } from './storage';
import { signTask } from './integrity';
import { getActiveProfileId } from './profileService';
import { todayKey } from '@/utils/date';

const KEY = (date: string) => `p.${getActiveProfileId()}.tasks.byDay.${date}`;
const CUSTOM_TPL_KEY = 'templates.custom';
const OVERRIDE_KEY = 'templates.override';

export interface TemplateOverride {
  basePoints?: number;
  standardMinutes?: number;
  disabled?: boolean;
}

export function getOverrides(): Record<string, TemplateOverride> {
  return storage.get<Record<string, TemplateOverride>>(OVERRIDE_KEY, {});
}
export function setOverrides(map: Record<string, TemplateOverride>): void {
  storage.set(OVERRIDE_KEY, map);
}
export function updateOverride(id: string, patch: Partial<TemplateOverride>): void {
  const map = getOverrides();
  map[id] = { ...(map[id] ?? {}), ...patch };
  setOverrides(map);
}
export function resetOverride(id: string): void {
  const map = getOverrides();
  delete map[id];
  setOverrides(map);
}

/** 应用 override 到模板；被 disabled 的会剔除 */
export function getEffectiveTemplates(): TaskTemplate[] {
  const overrides = getOverrides();
  return getAllTemplates()
    .filter((t) => !overrides[t.id]?.disabled)
    .map((t) => {
      const o = overrides[t.id];
      if (!o) return t;
      return {
        ...t,
        basePoints: o.basePoints ?? t.basePoints,
        standardMinutes: o.standardMinutes ?? t.standardMinutes,
      };
    });
}

/** 自定义模板（家长发布）持久化到本地加密存储，与 seed 合并 */
export function getCustomTemplates(): TaskTemplate[] {
  return storage.get<TaskTemplate[]>(CUSTOM_TPL_KEY, []);
}
export function saveCustomTemplate(tpl: TaskTemplate): void {
  const list = getCustomTemplates();
  const idx = list.findIndex((t) => t.id === tpl.id);
  if (idx >= 0) list[idx] = tpl;
  else list.push(tpl);
  storage.set(CUSTOM_TPL_KEY, list);
}
export function deleteCustomTemplate(id: string): void {
  storage.set(CUSTOM_TPL_KEY, getCustomTemplates().filter((t) => t.id !== id));
}
export function getAllTemplates(): TaskTemplate[] {
  return [...seedTaskTemplates, ...getCustomTemplates()];
}

function instanceFromTemplate(tpl: TaskTemplate, date: string): TaskInstance {
  return {
    id: `${tpl.id}__${date}`,
    templateId: tpl.id,
    date,
    title: tpl.title,
    subject: tpl.subject,
    difficulty: tpl.difficulty,
    basePoints: tpl.basePoints,
    standardMinutes: tpl.standardMinutes,
    kind: tpl.kind,
    description: tpl.description,
    category: tpl.category,
    link: tpl.link,
    once: tpl.once,
    // 每日任务自动选入今日；一次性作业等孩子手动"选入今日"
    pickedAt: tpl.once === true ? undefined : Date.now(),
    status: 'pending',
    slackMinutes: 0,
    actualSeconds: 0,
    pomodoros: 0,
    finishedInPomodoro: false,
  };
}

/** 把一次性作业选入今日任务清单 */
export function pickTaskForToday(date: string, taskId: string): TaskInstance | undefined {
  const list = getDayTasks(date);
  const idx = list.findIndex((t) => t.id === taskId);
  if (idx < 0) return undefined;
  const next: TaskInstance = { ...list[idx], pickedAt: Date.now() };
  const arr = [...list];
  arr[idx] = next;
  storage.set(KEY(date), arr);
  return next;
}

/** 撤回今日选择 · 只允许 pending 或 rejected；已开始/待审/已通过不给撤 */
export function unpickTaskForToday(date: string, taskId: string): TaskInstance | undefined {
  const list = getDayTasks(date);
  const idx = list.findIndex((t) => t.id === taskId);
  if (idx < 0) return undefined;
  const t = list[idx];
  if (t.status !== 'pending' && t.status !== 'rejected') return t;
  const next: TaskInstance = { ...t, pickedAt: undefined };
  const arr = [...list];
  arr[idx] = next;
  storage.set(KEY(date), arr);
  return next;
}

/** 扫全部历史日子的任务实例（用于 once 判定 / 总览统计） */
export function scanAllInstances(): TaskInstance[] {
  return scanAllInstancesLocal();
}
function scanAllInstancesLocal(): TaskInstance[] {
  const prefix = `p.${getActiveProfileId()}.tasks.byDay.`;
  const out: TaskInstance[] = [];
  for (const [, value] of storage.entries(prefix)) {
    if (Array.isArray(value)) out.push(...value as TaskInstance[]);
  }
  return out;
}

/** 获取指定日期的任务实例（不存在则按模板生成并写盘）
 *  once=true 的模板：全历史中该 templateId 已有实例时不再生成新实例（无论完成与否）
 *  once=false（默认）：每日生成
 */
export function getDayTasks(date: string = todayKey()): TaskInstance[] {
  const existing = storage.get<TaskInstance[] | null>(KEY(date), null);
  const dow = new Date(date).getDay();
  const historicalTemplateIds = new Set(scanAllInstancesLocal().map((t) => t.templateId));

  // 关键：一次性作业只有在历史里 approved 过才停止生成；只是"生成过但没做完"仍应每天出现
  const historicalApprovedIds = new Set(
    scanAllInstancesLocal()
      .filter((t) => t.status === 'approved')
      .map((t) => t.templateId),
  );
  void historicalTemplateIds;

  if (existing && existing.length > 0) {
    // 0. 回填新增字段（category / subject 改动等），保证老缓存跟得上模板
    const tplById = new Map(getAllTemplates().map((t) => [t.id, t]));
    let migrated = false;
    const upgraded = existing.map((t) => {
      const tpl = tplById.get(t.templateId);
      if (!tpl) return t;
      const patch: Partial<TaskInstance> = {};
      if (t.title !== tpl.title) patch.title = tpl.title;
      if (t.description !== tpl.description) patch.description = tpl.description;
      if (t.basePoints !== tpl.basePoints) patch.basePoints = tpl.basePoints;
      if (t.standardMinutes !== tpl.standardMinutes) patch.standardMinutes = tpl.standardMinutes;
      if (t.difficulty !== tpl.difficulty) patch.difficulty = tpl.difficulty;
      if (t.kind !== tpl.kind) patch.kind = tpl.kind;
      if (t.category !== tpl.category) patch.category = tpl.category;
      if (t.subject !== tpl.subject) patch.subject = tpl.subject;
      if (t.once !== tpl.once) patch.once = tpl.once;
      if (t.link !== tpl.link) patch.link = tpl.link;
      // 老实例回填 pickedAt：每日任务或已开工的 → 视为已选入
      const isDaily = tpl.once !== true;
      const isEngaged = t.status !== 'pending';
      if (t.pickedAt === undefined && (isDaily || isEngaged)) {
        patch.pickedAt = t.startedAt ?? Date.parse(date) ?? Date.now();
      }
      if (Object.keys(patch).length > 0) {
        migrated = true;
        return { ...t, ...patch };
      }
      return t;
    });

    // 1. 剔除模板已从 seed 移除的孤儿实例（approved 保留作为历史）
    const validIds = new Set(getAllTemplates().map((t) => t.id));
    const pruned = upgraded.filter((t) => validIds.has(t.templateId) || t.status === 'approved');
    if (migrated) storage.set(KEY(date), pruned);

    // 2. 补齐今日未生成的模板（seed 新增 / once 但未 approved 的作业）
    const existingTplIds = new Set(pruned.map((t) => t.templateId));
    const appended: TaskInstance[] = [];
    for (const tpl of getEffectiveTemplates()) {
      if (existingTplIds.has(tpl.id)) continue;
      if (tpl.weekdays && !tpl.weekdays.includes(dow)) continue;
      if (tpl.once && historicalApprovedIds.has(tpl.id)) continue;
      appended.push(instanceFromTemplate(tpl, date));
    }

    if (pruned.length !== existing.length || appended.length > 0) {
      const next = [...pruned, ...appended];
      storage.set(KEY(date), next);
      return next;
    }
    return pruned;
  }

  const generated: TaskInstance[] = [];
  for (const tpl of getEffectiveTemplates()) {
    if (tpl.weekdays && !tpl.weekdays.includes(dow)) continue;
    if (tpl.once && historicalApprovedIds.has(tpl.id)) continue;
    generated.push(instanceFromTemplate(tpl, date));
  }
  storage.set(KEY(date), generated);
  return generated;
}

/** 家长手动新增一条今日任务（直接生成 instance 到当日） */
export function appendDayTask(date: string, tpl: TaskTemplate): TaskInstance {
  const list = getDayTasks(date);
  const inst = instanceFromTemplate(tpl, date);
  if (list.some((t) => t.id === inst.id)) return list.find((t) => t.id === inst.id)!;
  const next = [...list, inst];
  storage.set(KEY(date), next);
  return inst;
}

export function getTaskById(date: string, taskId: string): TaskInstance | undefined {
  return getDayTasks(date).find((t) => t.id === taskId);
}

export function updateTask(date: string, task: TaskInstance): void {
  // 更新时用当前的 actualSeconds/pomodoros/completedAt 重算签名，防手改后签名过时
  const withSig: TaskInstance = {
    ...task,
    sig: signTask({
      id: task.id,
      actualSeconds: task.actualSeconds,
      pomodoros: task.pomodoros,
      completedAt: task.completedAt,
    }),
  };
  const list = getDayTasks(date).map((t) => (t.id === task.id ? withSig : t));
  storage.set(KEY(date), list);
}

export function setTaskStatus(date: string, taskId: string, status: TaskStatus): TaskInstance | undefined {
  const task = getTaskById(date, taskId);
  if (!task) return undefined;
  const next: TaskInstance = { ...task, status };
  updateTask(date, next);
  return next;
}

/** 重置当日数据（开发/演示用） */
export function resetDay(date: string = todayKey()): void {
  storage.remove(KEY(date));
}
