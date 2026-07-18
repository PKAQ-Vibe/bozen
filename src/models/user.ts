import type { Redemption } from './shop';

export interface UserState {
  /** 当前可用积分 */
  points: number;
  /** 累计获得积分 */
  totalEarned: number;
  /** 累计消费积分 */
  totalSpent: number;
  /** 兑换记录 */
  redemptions: Redemption[];
}
