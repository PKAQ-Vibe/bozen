// 任务模型（对应设计文档 §九 1）
// 迁移到 ant design pro 时，此处类型可以原封不动放到 src/models/ 下复用。

export type SubjectId =
  | 'chinese'
  | 'math'
  | 'english'
  | 'physics'
  | 'chemistry'
  | 'politics'
  | 'history'
  | 'geography'
  | 'biology'
  | 'reading'
  | 'sports'
  | 'habit';

export type TaskStatus =
  | 'pending'         // 未开始
  | 'in_progress'     // 进行中（已锁定宽松时间）
  | 'awaiting_review' // 孩子标记完成，等家长审核
  | 'approved'        // 家长审核通过，已结算
  | 'rejected';       // 家长退回重做（不进入时间银行）

export type TaskKind = 'required' | 'optional' | 'challenge';

/** 任务模板（家长 / 系统配置层；不绑定具体日期，可重复每日生成实例） */
export interface TaskTemplate {
  id: string;
  title: string;
  subject: SubjectId;
  /** 难度 1-5 星 */
  difficulty: 1 | 2 | 3 | 4 | 5;
  /** 基础分（按难度建议 40-150） */
  basePoints: number;
  /** 标准时间（分钟），孩子不可改 */
  standardMinutes: number;
  /** 任务类型 */
  kind: TaskKind;
  /** 可选备注 */
  description?: string;
  /** 学科内分类：背默译 / 名著阅读 / 单元卷 / 预习 / 单词默写 …；用于任务库二级分组 */
  category?: string;
  /** 点"开始"时跳转的内部路由（如 "/vocab"）；不填则进入专注模式 */
  link?: string;
  /** 默认每日生成；若仅在指定 weekday 生成可设此字段（0=周日 ~ 6=周六） */
  weekdays?: number[];
  /** true = 一次性作业（如暑假背诵、名著阅读），任一天 approved 后不再生成新实例；false/undefined = 每日重生（如生活习惯、每日复背） */
  once?: boolean;
}

/** 当日任务实例：模板 + 日期 + 运行时态 */
export interface TaskInstance {
  /** 实例 id：`${templateId}__${date}` */
  id: string;
  templateId: string;
  date: string; // yyyy-mm-dd

  // 模板快照（不变量，避免后续模板调整影响历史结算）
  title: string;
  subject: SubjectId;
  difficulty: 1 | 2 | 3 | 4 | 5;
  basePoints: number;
  standardMinutes: number;
  kind: TaskKind;
  description?: string;
  category?: string;
  link?: string;
  /** 是否一次性作业（snapshot from template）·  false/undefined = 每日刷新 */
  once?: boolean;
  /** 孩子把这条从任务库选入"今日任务"的时间；空 = 只是在池子里，不是今天要做的 */
  pickedAt?: number;

  // 运行时态
  status: TaskStatus;
  /** 开始前锁定的宽松时间，上限 = standardMinutes * 0.2，0 表示没设 */
  slackMinutes: number;
  /** 系统计时累积的实际用时（秒），不允许手填 */
  actualSeconds: number;
  /** 完成的番茄钟数量（不中断） */
  pomodoros: number;
  /** 是否在番茄钟内完成 → 基础分 ×1.2 */
  finishedInPomodoro: boolean;
  /** 结算入账的积分（家长审核后写入） */
  awardedPoints?: number;
  /** 节约时间（分钟，正值才入时间银行） */
  savedMinutes?: number;
  startedAt?: number;
  completedAt?: number;
  reviewedAt?: number;
  reviewNote?: string;
  /** §一 关联感：家长通过时的具体肯定（"这篇作文开头比上次有意思"） */
  praise?: string;
  /** 孩子提交的完成说明（≤500 字） */
  submissionText?: string;
  /** 孩子提交的照片（Data URL，最多 3 张 640px） */
  submissionImages?: string[];
  /** 背诵类任务提交时保存的篇目原文，供家长审核核对。 */
  recitationOriginal?: {
    textId: string;
    title: string;
    author?: string;
    lines: string[];
  };
  /** §八 #2 反作弊：actualSeconds/pomodoros/completedAt 的本地签名 */
  sig?: string;
}
