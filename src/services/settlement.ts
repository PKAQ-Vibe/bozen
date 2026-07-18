// 单任务结算（方案 A），对应设计文档 §4.4。
// 输出：
//   awardedPoints : 该任务结算的积分（家长审核通过时落账）
//   savedMinutes  : 进入「时间银行」预览池的节约时间（负值视为 0）
//   ratio         : 应用到基础分上的倍率（不含番茄钟内完成 / challenge 加成）
//   notes         : 给 UI 显示的逐条说明

import type { IncentiveConfig, TaskInstance } from '@/models';
import { verifyTaskSig } from './integrity';

export interface SettlementResult {
  awardedPoints: number;
  savedMinutes: number;
  ratio: number;
  notes: string[];
}

/** 给定任务实例和参数，按方案 A 计算「单任务」结算结果。 */
export function settleTask(task: TaskInstance, config: IncentiveConfig): SettlementResult {
  // §八 #2 反作弊：签名不匹配 → 视为篡改，作废本次结算
  const sigOk = verifyTaskSig(
    { id: task.id, actualSeconds: task.actualSeconds, pomodoros: task.pomodoros, completedAt: task.completedAt },
    task.sig,
  );
  if (!sigOk) {
    return {
      awardedPoints: 0,
      savedMinutes: 0,
      ratio: 0,
      notes: ['⚠️ 数据完整性校验失败 · 本次结算作废（可能被手工修改）'],
    };
  }
  const actualMinutes = task.actualSeconds / 60;
  const standard = task.standardMinutes;
  const slack = Math.min(task.slackMinutes, standard * config.slackMaxRatio);

  let ratio = 1;
  const notes: string[] = [];

  if (slack === 0) {
    // 路径 A：不设宽松（高风险高回报）
    if (actualMinutes <= standard) {
      ratio = 1;
      notes.push('在标准时间内完成 → 基础分 100%');
    } else {
      const overRatio = (actualMinutes - standard) / standard;
      if (overRatio <= 0.1) {
        ratio = 2 / 3;
        notes.push('超时 0-10% → 基础分 ×2/3');
      } else if (overRatio <= 0.2) {
        ratio = 1 / 3;
        notes.push('超时 10-20% → 基础分 ×1/3');
      } else {
        ratio = 0;
        notes.push('超时 > 20% → 0 分，仅记完成');
      }
    }
  } else {
    // 路径 B：设了宽松（求稳）
    if (actualMinutes <= standard) {
      ratio = 1;
      notes.push('标准时间内完成 → 基础分 100%（放弃提前奖）');
    } else if (actualMinutes <= standard + slack) {
      ratio = 0.5;
      notes.push('在宽松时间内完成 → 基础分 ×1/2');
    } else {
      ratio = 0;
      notes.push('超出宽松时间 → 0 分，仅记完成');
    }
  }

  // 番茄钟内完成的乘子
  if (task.finishedInPomodoro && ratio > 0) {
    ratio *= config.pomodoroFinishMultiplier;
    notes.push(`番茄钟内完成 → ×${config.pomodoroFinishMultiplier}`);
  }

  // 主动性加成（不封顶）
  if (task.kind === 'challenge' && ratio > 0) {
    ratio *= 1 + config.challengeBonusRatio;
    notes.push(`挑战任务 → 主动性加成 +${Math.round(config.challengeBonusRatio * 100)}%`);
  }

  const awardedPoints = Math.round(task.basePoints * ratio);
  const savedMinutes = Math.max(0, standard - actualMinutes);

  if (savedMinutes > 0 && ratio > 0) {
    notes.push(`节约 ${savedMinutes.toFixed(1)} 分 → 存入时间银行预览`);
  }

  return { awardedPoints, savedMinutes, ratio, notes };
}

/** 给定一天的「节约时间总和」（已封顶前），按分段倍率换算时间银行积分。 */
export function calcTimeBankPoints(totalSavedMinutes: number, config: IncentiveConfig): number {
  const capped = Math.min(totalSavedMinutes, config.timeBankDailyCapMinutes);
  const highCut = Math.min(capped, config.timeBankHighTierMinutes);
  const midCut = Math.max(0, capped - config.timeBankHighTierMinutes);
  return Math.round(highCut * config.timeBankHighRate + midCut * config.timeBankMidRate);
}
