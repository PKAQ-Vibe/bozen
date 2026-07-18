// 用户态：积分钱包 + 兑换记录。

import type { Redemption, RedemptionStatus, UserState } from '@/models';
import { storage } from './storage';
import { repayFromEarnings } from './advanceService';
import { getActiveProfileId } from './profileService';

const KEY = () => `p.${getActiveProfileId()}.user.state`;

const DEFAULT_STATE: UserState = {
  points: 0,
  totalEarned: 0,
  totalSpent: 0,
  redemptions: [],
};

export function getUser(): UserState {
  return storage.get<UserState>(KEY(), DEFAULT_STATE);
}

function save(next: UserState): UserState {
  storage.set(KEY(), next);
  return next;
}

/** 加积分（家长审核通过任务时调用）
 *  §7 提前兑现：若有活跃预支，earned 一半用于还债，一半入钱包
 */
export function earnPoints(amount: number): UserState {
  if (amount <= 0) return getUser();
  const u = getUser();
  const { keepAmount } = repayFromEarnings(amount);
  return save({
    ...u,
    points: u.points + keepAmount,
    totalEarned: u.totalEarned + amount,
  });
}

/** 家长批准预支时的一次性发放 */
export function grantAdvance(amount: number): UserState {
  const u = getUser();
  return save({
    ...u,
    points: u.points + amount,
  });
}

/** 退回积分（任务被退回，撤销之前的入账） */
export function refundPoints(amount: number): UserState {
  if (amount <= 0) return getUser();
  const u = getUser();
  return save({
    ...u,
    points: Math.max(0, u.points - amount),
    totalEarned: Math.max(0, u.totalEarned - amount),
  });
}

/** 兑换商品：扣分 + 写兑换单 */
export function redeem(item: { id: string; name: string; price: number }): {
  ok: boolean;
  reason?: string;
  user: UserState;
  redemption?: Redemption;
} {
  const u = getUser();
  if (u.points < item.price) {
    return { ok: false, reason: '积分不足', user: u };
  }
  const r: Redemption = {
    id: `r-${Date.now()}`,
    itemId: item.id,
    itemName: item.name,
    price: item.price,
    createdAt: Date.now(),
    status: 'pending_review',
  };
  const next = save({
    ...u,
    points: u.points - item.price,
    totalSpent: u.totalSpent + item.price,
    redemptions: [r, ...u.redemptions],
  });
  return { ok: true, user: next, redemption: r };
}

export function setRedemptionStatus(id: string, status: RedemptionStatus, note?: string): UserState {
  const u = getUser();
  const redemptions = u.redemptions.map((r) =>
    r.id === id ? { ...r, status, reviewNote: note } : r,
  );
  return save({ ...u, redemptions });
}

export function resetUser(): UserState {
  storage.remove(KEY());
  return getUser();
}
