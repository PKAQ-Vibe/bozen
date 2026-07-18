// 奖励商城（§十一）
// 三大类：🎮 游戏时间 / 🎟️ 特权卡 / ⚽ 足球周边
// 踢球不进商城（§11.3）。

export type ShopCategory = 'game' | 'privilege' | 'football';

export interface ShopItem {
  id: string;
  category: ShopCategory;
  name: string;
  /** 简短描述 */
  description: string;
  /** 兑换所需积分 */
  price: number;
  /** 每周限购（针对游戏时间类做总上限），undefined 表示不限 */
  weeklyLimit?: number;
  /** 每年限购（针对球鞋券：每年最多 2 双） */
  yearlyLimit?: number;
  emoji: string;
}

export type RedemptionStatus = 'pending_review' | 'approved' | 'rejected';

export interface Redemption {
  id: string;
  itemId: string;
  itemName: string;
  price: number;
  createdAt: number;
  status: RedemptionStatus;
  reviewNote?: string;
}
