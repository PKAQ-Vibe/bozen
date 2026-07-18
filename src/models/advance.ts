// 提前兑现 · 方案 C（§7.4）：任务预支
// 核心：偿还的是任务/努力，不利滚利，总额封顶，必须家长批准

export type AdvanceStatus = 'pending' | 'approved' | 'settled' | 'rejected';

export interface Advance {
  id: string;
  createdAt: number;
  /** 孩子申请的预支积分数额 */
  amount: number;
  /** 目的说明（想买什么） */
  purpose: string;
  /** 承诺额外完成的任务量（1.2 倍担保） */
  promisedTaskCount: number;
  /** 还款截止（约定期限） */
  dueAt: number;
  /** 已还的金额（后续 earn 的一半入还款） */
  repaid: number;
  status: AdvanceStatus;
  approvedAt?: number;
  settledAt?: number;
  parentNote?: string;
}

export const ADVANCE_HARD_CAP = 500;
export const ADVANCE_TASK_MULTIPLIER = 1.2;
export const ADVANCE_REPAY_RATIO = 0.5;
