// 全局可调参数（§九 8：统一配置入口，便于调参防通胀）

export interface IncentiveConfig {
  /** 番茄钟时长（分钟） */
  pomodoroMinutes: number;
  /** 完成 1 个番茄钟奖励的专注加成 */
  pomodoroBonusPerCycle: number;
  /** 连续 3 个番茄钟额外加成 */
  pomodoroStreakBonus: number;
  /** 在番茄钟内完成任务的基础分倍率 */
  pomodoroFinishMultiplier: number;

  /** 宽松时间上限：标准时间的百分比 */
  slackMaxRatio: number;

  /** 时间银行单日封顶（分钟） */
  timeBankDailyCapMinutes: number;
  /** 前 N 分钟使用高倍率 */
  timeBankHighTierMinutes: number;
  /** 高倍率：每节约 1 分钟兑多少积分 */
  timeBankHighRate: number;
  /** 中倍率 */
  timeBankMidRate: number;

  /** 主动性加成（不封顶）：完成 challenge 类任务额外百分比 */
  challengeBonusRatio: number;
}
