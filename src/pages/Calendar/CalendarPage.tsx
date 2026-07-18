import { useMemo, useState } from 'react';
import { Button, Card, Tag } from 'animal-island-ui';
import { Check, ChevronLeft, ChevronRight, PiggyBank } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import {
  getMonthCheckIns,
  getMonthPoints,
  getStreakDays,
  isDayCheckedIn,
  previewBankPoints,
  scanAllInstances,
  seedConfig,
} from '@/services';
import { todayKey } from '@/utils/date';
import './CalendarPage.css';

const DAILY_TARGET = 150;

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

function fmt(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface Cell {
  key: string;
  date: Date;
  inMonth: boolean;
}

function buildMonth(cursor: Date): Cell[] {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const wd = (first.getDay() + 6) % 7; // 周一起始
  const start = new Date(first);
  start.setDate(1 - wd);
  const cells: Cell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push({ key: fmt(d), date: d, inMonth: d.getMonth() === cursor.getMonth() });
  }
  return cells;
}

export default function CalendarPage() {
  const [cursor, setCursor] = useState(() => new Date(todayKey()));
  const [selected, setSelected] = useState(() => todayKey());
  const cells = useMemo(() => buildMonth(cursor), [cursor]);

  const tasks = useMemo(
    () => scanAllInstances().filter((task) => task.date === selected && task.pickedAt !== undefined),
    [selected],
  );
  const approved = tasks.filter((t) => t.status === 'approved');
  const totalPts = approved.reduce((a, t) => a + (t.awardedPoints ?? 0), 0);
  const goal = DAILY_TARGET;
  const goalPct = Math.min(100, (totalPts / goal) * 100);

  // 顶栏 3 stat + 月历打卡点：全部走真数据
  const monthCheckIns = useMemo(() => getMonthCheckIns(cursor), [cursor, tasks]);
  const streakDays = useMemo(() => getStreakDays(todayKey()), [tasks]);
  const monthPts = useMemo(() => getMonthPoints(cursor), [cursor, tasks]);

  const savedMinutes = approved.reduce((a, t) => a + (t.savedMinutes ?? 0), 0);
  const bankPts = previewBankPoints(approved);
  const dailyCap = seedConfig.timeBankDailyCapMinutes;

  const monthLabel = `${cursor.getFullYear()} 年 ${cursor.getMonth() + 1} 月`;

  return (
    <>
      <PageHeader
        title="学习日历 · 每日进度"
        sub={`${monthLabel} · 坚持就是胜利`}
        extra={
          <>
            <div className="cal-stat cal-stat--green">
              <span className="cal-stat__value">{monthCheckIns}</span>
              <span className="cal-stat__label">本月打卡</span>
            </div>
            <div className="cal-stat cal-stat--orange">
              <span className="cal-stat__value">{streakDays}</span>
              <span className="cal-stat__label">连续天数 🔥</span>
            </div>
            <div className="cal-stat cal-stat--yellow">
              <span className="cal-stat__value">{monthPts}</span>
              <span className="cal-stat__label">本月积分</span>
            </div>
          </>
        }
      />

      <div className="page-body cal-page">
        {/* 月历 */}
        <section className="cal-main">
          <div className="cal-card">
            <div className="cal-toolbar">
              <Button
                size="small"
                icon={<ChevronLeft size={14} />}
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              >
                上月
              </Button>
              <span className="cal-toolbar__title">{monthLabel}</span>
              <div className="cal-toolbar__spacer" />
              <Button size="small" onClick={() => { setCursor(new Date(todayKey())); setSelected(todayKey()); }}>今天</Button>
              <Button
                size="small"
                icon={<ChevronRight size={14} />}
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              >
                下月
              </Button>
            </div>

            <div className="cal-grid">
              {WEEK_LABELS.map((w) => (
                <div key={w} className="cal-head">{w}</div>
              ))}
              {cells.map((c) => {
                const key = c.key;
                const isToday = key === todayKey();
                const isSel = key === selected;
                const done = c.inMonth && isDayCheckedIn(key);
                return (
                  <button
                    key={key}
                    type="button"
                    className={`cal-cell ${c.inMonth ? '' : 'cal-cell--dim'} ${isSel ? 'cal-cell--sel' : ''} ${isToday ? 'cal-cell--today' : ''}`}
                    onClick={() => setSelected(key)}
                  >
                    <span className="cal-cell__num">{c.date.getDate()}</span>
                    {c.inMonth && done && <span className="cal-cell__dot" />}
                  </button>
                );
              })}
            </div>

            <div className="cal-legend">
              <span><span className="cal-legend__dot cal-legend__dot--done" /> 已打卡</span>
              <span><span className="cal-legend__dot cal-legend__dot--miss" /> 未完成</span>
              <span><span className="cal-legend__dot cal-legend__dot--today" /> 今天</span>
            </div>
          </div>
        </section>

        {/* 当日详情 */}
        <aside className="cal-side">
          <div className="cal-day-head">
            <div className="cal-day-head__date">
              {new Date(selected).getMonth() + 1} 月 {new Date(selected).getDate()} 日
              {selected === todayKey() && <span className="cal-day-head__today">今天</span>}
            </div>
            <div className="cal-day-head__hint">
              {approved.length > 0 ? '今日进度稳步推进 ✨' : '还没有任务入账'}
            </div>
          </div>

          <div className="cal-day-stats">
            <Card className="cal-day-stat">
              <div className="cal-day-stat__value">{approved.length}/{tasks.length}</div>
              <div className="cal-day-stat__label">完成率</div>
            </Card>
            <Card className="cal-day-stat">
              <div className="cal-day-stat__value">+{totalPts}</div>
              <div className="cal-day-stat__label">今日积分</div>
            </Card>
            <Card className="cal-day-stat">
              <div className="cal-day-stat__value">{savedMinutes.toFixed(0)}分</div>
              <div className="cal-day-stat__label">节约时间</div>
            </Card>
          </div>

          <Card className="cal-day-goal">
            <div className="cal-day-goal__row">
              <span>今日目标</span>
              <span>{totalPts} / {goal} pts</span>
            </div>
            <div className="cal-day-goal__bar">
              <div style={{ width: `${goalPct}%` }} />
            </div>
          </Card>

          <Card color="app-yellow" pattern="app-yellow" className="time-bank-card">
            <div className="time-bank-card__head">
              <PiggyBank size={16} color="var(--c-yellow)" />
              <span className="time-bank-card__title">今日时间银行</span>
              <div className="cal-side__spacer" />
              <Tag size="small" color="app-yellow" variant="solid">+{bankPts} pts</Tag>
            </div>
            <div className="time-bank-card__meta">
              节约 <strong>{savedMinutes.toFixed(1)}</strong> 分钟 · 单日封顶 {dailyCap} 分
            </div>
            <div className="time-bank-card__bar">
              <div style={{ width: `${Math.min(100, (savedMinutes / dailyCap) * 100)}%` }} />
            </div>
            <div className="time-bank-card__hint">
              仅质量通过的任务计入 · 前 {seedConfig.timeBankHighTierMinutes} 分高倍率、后 {dailyCap - seedConfig.timeBankHighTierMinutes} 分中倍率
            </div>
          </Card>

          <div className="cal-day-lbl">当日任务</div>
          <div className="cal-day-list">
            {tasks.length === 0 ? (
              <div className="cal-day-empty">这一天没有任务</div>
            ) : (
              tasks.slice(0, 6).map((t) => {
                const done = t.status === 'approved';
                return (
                  <Card key={t.id} color={done ? 'app-green' : 'default'} className={`cal-task-row ${done ? 'cal-task-row--done' : ''}`}>
                    <div className={`cal-task-row__check ${done ? 'cal-task-row__check--done' : ''}`}>
                      {done && <Check size={12} color="#fff" />}
                    </div>
                    <span className="cal-task-row__title">{t.title}</span>
                    <Tag size="small" color={done ? 'app-green' : 'default'}>+{t.awardedPoints ?? t.basePoints}</Tag>
                  </Card>
                );
              })
            )}
          </div>

        </aside>
      </div>
    </>
  );
}
