// 每日时间银行（§五）
// 单日封顶 60 分钟；前 30 分钟高倍率，30-60 分钟中倍率，>60 不计。
// 仅计入「质量验收通过」任务的节约时间。

export interface TimeBankEntry {
  taskId: string;
  /** 任务节约分钟（正值），来自 standardMinutes - actualMinutes */
  savedMinutes: number;
  /** 落账时间戳，由家长审核通过时写入；预览时无 */
  settledAt?: number;
}

export interface DailyTimeBank {
  /** yyyy-mm-dd */
  date: string;
  /** 预览池：所有已提交（含等待审核）任务的节约时间合计 */
  previewMinutes: number;
  /** 已结算池：所有审核通过任务的节约时间合计（封顶 60） */
  settledMinutes: number;
  /** 当日已发放的时间银行积分 */
  awardedPoints: number;
  /** 当日各任务的入池明细 */
  entries: TimeBankEntry[];
}
