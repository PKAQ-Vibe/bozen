// 子系统 ↔ 任务 联动
// 词汇一轮完成 / 听诵通过 / 元素周期表通关 → 找今日实例对应任务 → 转 awaiting_review

import type { TaskInstance } from '@/models';
import { getDayTasks, updateTask } from './taskService';
import { todayKey } from '@/utils/date';

/** 硬编码映射：子系统事件 → 任务模板 ID（产品逻辑，家长不改） */
const LINK_MAP: Record<string, string[]> = {
  // 词汇背诵：完成某单元的整轮
  'vocab.unit.eng-8up-u1': ['english-8up-u1-words'],
  'vocab.unit.eng-8up-u2': ['english-8up-u2-words'],
  'vocab.unit.eng-8up-u3': ['english-8up-u3-words'],
  'vocab.unit.eng-8up-u4': ['english-8up-u4-words'],
  'vocab.unit.eng-8up-u5': ['english-8up-u5-words', 'english-8up-u57-words'],
  'vocab.unit.eng-8up-u6': ['english-8up-u6-words', 'english-8up-u57-words'],
  'vocab.unit.eng-8up-u7': ['english-8up-u7-words', 'english-8up-u57-words'],
  // 元素周期表 · 前 20 号通关
  'periodic.stage1.pass': ['chemistry-element'],
  // 听诵 · 课文类
  'recite.text.pass': ['english-8up-u1-text', 'english-8up-u2-text', 'english-8up-u3-text', 'english-8up-u4-text', 'chinese-recite'],
};

/** 联动打卡：只更新处于 pending/in_progress 状态的任务，标记为 awaiting_review */
export function linkComplete(
  eventKey: string,
  info: { actualSeconds?: number; note?: string },
): { updatedIds: string[]; taskTitles: string[] } {
  const templateIds = LINK_MAP[eventKey];
  if (!templateIds || templateIds.length === 0) return { updatedIds: [], taskTitles: [] };

  const date = todayKey();
  const tasks = getDayTasks(date);
  const updated: TaskInstance[] = [];

  for (const tpl of templateIds) {
    const t = tasks.find((x) => x.templateId === tpl && (x.status === 'pending' || x.status === 'in_progress'));
    if (!t) continue;
    const now = Date.now();
    const nextSeconds = Math.max(t.actualSeconds, info.actualSeconds ?? Math.min(t.standardMinutes * 60, 5 * 60));
    const next: TaskInstance = {
      ...t,
      actualSeconds: nextSeconds,
      status: 'awaiting_review',
      completedAt: now,
      submissionText: info.note ?? t.submissionText,
      finishedInPomodoro: true,
    };
    updateTask(date, next);
    updated.push(next);
  }

  return {
    updatedIds: updated.map((t) => t.id),
    taskTitles: updated.map((t) => t.title),
  };
}
