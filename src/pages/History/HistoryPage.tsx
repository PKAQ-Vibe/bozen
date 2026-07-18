// 任务历史 · 按天列出选入 / 完成 / 通过 情况

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, Tag, Title } from 'animal-island-ui';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { scanAllInstances } from '@/services';
import type { TaskInstance } from '@/models';
import './HistoryPage.css';

interface DaySummary {
  date: string;
  picked: TaskInstance[];
  awaiting: TaskInstance[];
  approved: TaskInstance[];
  rejected: TaskInstance[];
  points: number;
}

export default function HistoryPage() {
  const days = useMemo(() => {
    const byDate = new Map<string, TaskInstance[]>();
    for (const t of scanAllInstances()) {
      if (!byDate.has(t.date)) byDate.set(t.date, []);
      byDate.get(t.date)!.push(t);
    }
    const summaries: DaySummary[] = [];
    for (const [date, list] of byDate.entries()) {
      const picked = list.filter((t) => t.pickedAt !== undefined);
      const approved = list.filter((t) => t.status === 'approved');
      const awaiting = list.filter((t) => t.status === 'awaiting_review');
      const rejected = list.filter((t) => t.status === 'rejected');
      const points = approved.reduce((s, t) => s + (t.awardedPoints ?? 0), 0);
      summaries.push({ date, picked, awaiting, approved, rejected, points });
    }
    return summaries.sort((a, b) => b.date.localeCompare(a.date));
  }, []);

  return (
    <>
      <PageHeader
        title="任务历史"
        sub="每天的选择与完成情况"
        extra={<Link to="/tasks"><Tag size="small" color="app-green"><ArrowLeft size={12} /> 返回选课中心</Tag></Link>}
      />
      <div className="page-body history-page">
        {days.length === 0 ? (
          <Card type="dashed" className="history-empty">
            还没有历史记录 · 从今天开始你的暑假旅程 🌱
          </Card>
        ) : (
          <div className="history-list">
            {days.map((d) => (
              <Card key={d.date} className="history-day">
                <div className="history-day__head">
                  <CalendarDays size={16} color="var(--c-green)" />
                  <span className="history-day__date">{d.date}</span>
                  <span className="history-day__spacer" />
                  <Tag size="small" color="app-green">✓ 通过 {d.approved.length}</Tag>
                  {d.awaiting.length > 0 && <Tag size="small" color="app-yellow">待审 {d.awaiting.length}</Tag>}
                  {d.rejected.length > 0 && <Tag size="small" color="app-red">退回 {d.rejected.length}</Tag>}
                  <Tag size="small" color="purple">选入 {d.picked.length}</Tag>
                  <Tag size="small" color="app-orange">+{d.points} pts</Tag>
                </div>
                {d.approved.length + d.awaiting.length + d.rejected.length > 0 && (
                  <div className="history-day__rows">
                    {[...d.approved, ...d.awaiting, ...d.rejected].slice(0, 12).map((t) => (
                      <div key={t.id} className="history-day__row">
                        <span className={`history-day__status history-day__status--${t.status}`}>
                          {t.status === 'approved' ? '✓' : t.status === 'awaiting_review' ? '⏳' : '↩'}
                        </span>
                        <span className="history-day__title" title={t.title}>{t.title}</span>
                        {t.awardedPoints ? <span className="history-day__pts">+{t.awardedPoints}</span> : null}
                      </div>
                    ))}
                    {d.approved.length + d.awaiting.length + d.rejected.length > 12 && (
                      <div className="history-day__more">…还有 {d.approved.length + d.awaiting.length + d.rejected.length - 12} 条</div>
                    )}
                  </div>
                )}
                {d.picked.length > 0 && d.approved.length + d.awaiting.length + d.rejected.length === 0 && (
                  <div className="history-day__pending">
                    <Title size="small" color="app-yellow">📌 选入了 {d.picked.length} 项，但没有完成记录</Title>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
