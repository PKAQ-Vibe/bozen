// 预支服务：申请 / 家长审核 / 还款
// §7.5 三条底线：偿还任务、不利滚利、总额封顶、家长必审

import type { Advance } from '@/models';
import { ADVANCE_HARD_CAP, ADVANCE_TASK_MULTIPLIER } from '@/models';
import { storage } from './storage';

const KEY = 'advances';

export function getAdvances(): Advance[] {
  return storage.get<Advance[]>(KEY, []);
}
export function saveAdvances(list: Advance[]): void {
  storage.set(KEY, list);
}

export function getActiveAdvance(): Advance | undefined {
  return getAdvances().find((a) => a.status === 'approved');
}

export function hasPending(): boolean {
  return getAdvances().some((a) => a.status === 'pending');
}

export function outstandingDebt(): number {
  const a = getActiveAdvance();
  if (!a) return 0;
  return Math.max(0, a.amount - a.repaid);
}

export function applyForAdvance(input: {
  amount: number;
  purpose: string;
  days: number;
}): { ok: boolean; reason?: string; advance?: Advance } {
  const list = getAdvances();
  if (list.some((a) => a.status === 'approved' || a.status === 'pending')) {
    return { ok: false, reason: '已有一个进行中的预支，还清后才能再申请' };
  }
  if (input.amount < 30) return { ok: false, reason: '预支不小于 30 pts' };
  if (input.amount > ADVANCE_HARD_CAP) return { ok: false, reason: `预支不超过 ${ADVANCE_HARD_CAP} pts` };
  if (input.days < 1 || input.days > 14) return { ok: false, reason: '还款期 1-14 天' };

  const now = Date.now();
  const promisedTaskCount = Math.ceil((input.amount / 40) * ADVANCE_TASK_MULTIPLIER);
  const advance: Advance = {
    id: `adv-${now}`,
    createdAt: now,
    amount: input.amount,
    purpose: input.purpose.trim() || '未说明',
    promisedTaskCount,
    dueAt: now + input.days * 86_400_000,
    repaid: 0,
    status: 'pending',
  };
  saveAdvances([...list, advance]);
  return { ok: true, advance };
}

export function approveAdvance(id: string, note?: string): Advance | undefined {
  const list = getAdvances();
  const idx = list.findIndex((a) => a.id === id);
  if (idx < 0) return;
  list[idx] = {
    ...list[idx],
    status: 'approved',
    approvedAt: Date.now(),
    parentNote: note,
  };
  saveAdvances(list);
  return list[idx];
}

export function rejectAdvance(id: string, note?: string): Advance | undefined {
  const list = getAdvances();
  const idx = list.findIndex((a) => a.id === id);
  if (idx < 0) return;
  list[idx] = { ...list[idx], status: 'rejected', parentNote: note };
  saveAdvances(list);
  return list[idx];
}

/** 收到 earnedAmount 积分时的还款：先扣一半到 debt，直到还清 */
export function repayFromEarnings(earnedAmount: number): { keepAmount: number; repaid: number } {
  const list = getAdvances();
  const idx = list.findIndex((a) => a.status === 'approved');
  if (idx < 0) return { keepAmount: earnedAmount, repaid: 0 };
  const active = list[idx];
  const remain = active.amount - active.repaid;
  if (remain <= 0) {
    list[idx] = { ...active, status: 'settled', settledAt: Date.now() };
    saveAdvances(list);
    return { keepAmount: earnedAmount, repaid: 0 };
  }
  // 按 50% 还
  const toRepay = Math.min(remain, Math.floor(earnedAmount * 0.5));
  const nextRepaid = active.repaid + toRepay;
  list[idx] = {
    ...active,
    repaid: nextRepaid,
    ...(nextRepaid >= active.amount ? { status: 'settled' as const, settledAt: Date.now() } : {}),
  };
  saveAdvances(list);
  return { keepAmount: earnedAmount - toRepay, repaid: toRepay };
}
