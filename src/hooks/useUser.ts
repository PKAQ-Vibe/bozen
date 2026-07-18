// 简易 user store：用 useSyncExternalStore 让 user 跨页面同步。
// 不引第三方状态库；Pro 迁移时可替换为 zustand / dva / umi-model。

import { useSyncExternalStore } from 'react';
import {
  earnPoints,
  getRankByPoints,
  getUser,
  redeem,
  refundPoints,
  resetUser,
  setRedemptionStatus,
} from '@/services';
import type { Rank } from '@/services/rankService';
import type { Redemption, RedemptionStatus, UserState } from '@/models';

type Listener = () => void;
const listeners = new Set<Listener>();
let snapshot: UserState = getUser();

function emit() {
  snapshot = getUser();
  listeners.forEach((l) => l());
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return snapshot;
}

/** 升段回调注册（首次跨过阈值时触发） */
let rankUpListener: ((from: Rank, to: Rank) => void) | null = null;
export function onRankUp(cb: (from: Rank, to: Rank) => void) {
  rankUpListener = cb;
}

export function useUser() {
  const user = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    user,
    earn(amount: number) {
      const before = getRankByPoints(user.points);
      earnPoints(amount);
      emit();
      const after = getRankByPoints(snapshot.points);
      if (after.key !== before.key && rankUpListener) rankUpListener(before, after);
    },
    refund(amount: number) {
      refundPoints(amount);
      emit();
    },
    redeem(item: { id: string; name: string; price: number }) {
      const r = redeem(item);
      emit();
      return r;
    },
    setRedemptionStatus(id: string, status: RedemptionStatus, note?: string): Redemption | undefined {
      const next = setRedemptionStatus(id, status, note);
      emit();
      return next.redemptions.find((x) => x.id === id);
    },
    reset() {
      resetUser();
      emit();
    },
  };
}

/** 提供给非组件层（任务结算回调）刷新视图 */
export function notifyUserChanged() {
  emit();
}
