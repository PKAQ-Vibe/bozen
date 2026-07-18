// 限时冲刺挑战（§七 7.2）
// 达成 → 解锁机会（不入积分账户，避免债务化）
// 到期 → 关闭机会，不扣分不负债

export interface Challenge {
  id: string;
  title: string;
  /** 展示 emoji */
  emoji: string;
  /** 副标题（描述解锁内容） */
  subtitle: string;
  /** 挑战关联的奖励说明（观赛权 / 游戏时长 / 出游等，不计入积分） */
  reward: string;
  /** 目标：完成 N 个已家长审核通过的任务（可加类型/学科过滤） */
  targetTaskCount: number;
  /** 当前进度（进入首页时动态计算） */
  progress?: number;
  /** 起止时间戳 */
  startAt: number;
  endAt: number;
  /** 达成时间戳 */
  achievedAt?: number;
  /** 是否已结算（达成后仅记录一次） */
  settled?: boolean;
}
