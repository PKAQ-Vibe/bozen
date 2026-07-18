// 生活习惯（§6 脚手架退场友好）：家长可编辑清单 + 孩子每日勾选

export interface HabitDef {
  id: string;
  label: string;
  emoji: string;
  /** 完成一次的积分（脚手架退场时家长可下调） */
  points: number;
}
