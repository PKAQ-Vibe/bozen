// 时间银行服务：按日聚合，提供「预览池」与「已结算池」两个视图。

import type { DailyTimeBank, TaskInstance } from '@/models';
import { calcTimeBankPoints } from './settlement';
import { seedConfig } from './seed';
import { getDayTasks } from './taskService';
import { todayKey } from '@/utils/date';

/** 从当日任务实例聚合时间银行视图（不依赖额外存储，单一来源） */
export function getDailyTimeBank(date: string = todayKey()): DailyTimeBank {
  const tasks = getDayTasks(date);

  const previewEntries = tasks
    .filter((t) => t.status !== 'rejected' && (t.savedMinutes ?? 0) > 0)
    .map((t) => ({ taskId: t.id, savedMinutes: t.savedMinutes ?? 0 }));

  const settledEntries = tasks
    .filter((t) => t.status === 'approved' && (t.savedMinutes ?? 0) > 0)
    .map((t) => ({
      taskId: t.id,
      savedMinutes: t.savedMinutes ?? 0,
      settledAt: t.reviewedAt,
    }));

  const sum = (arr: { savedMinutes: number }[]) =>
    arr.reduce((acc, e) => acc + e.savedMinutes, 0);

  const previewMinutes = sum(previewEntries);
  const settledMinutes = sum(settledEntries);
  const awardedPoints = calcTimeBankPoints(settledMinutes, seedConfig);

  return {
    date,
    previewMinutes,
    settledMinutes,
    awardedPoints,
    entries: previewEntries,
  };
}

/** 给 UI 用：当前预览池预计可兑换的积分（封顶后分段倍率） */
export function previewBankPoints(tasks: TaskInstance[]): number {
  const previewSaved = tasks
    .filter((t) => t.status !== 'rejected' && (t.savedMinutes ?? 0) > 0)
    .reduce((acc, t) => acc + (t.savedMinutes ?? 0), 0);
  return calcTimeBankPoints(previewSaved, seedConfig);
}
