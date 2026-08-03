import { useMemo, useState } from 'react';
import { Button, Card, Input, Modal, Tabs, Tag, Title } from 'animal-island-ui';
import type { TabItem } from 'animal-island-ui';
import { ClipboardCheck, Eye, Gift, KeyRound, Lock, Plus, ShieldCheck, Trophy } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import PublishTaskModal from '@/components/modals/PublishTaskModal';
import PublishGiftModal from '@/components/modals/PublishGiftModal';
import PublishChallengeModal from '@/components/modals/PublishChallengeModal';
import ParentSettingsPanel from './ParentSettingsPanel';
import AdvanceReviewPanel from './AdvanceReviewPanel';
import HabitsManagePanel from './HabitsManagePanel';
import BackupPanel from './BackupPanel';
import VocabManagePanel from './VocabManagePanel';
import { useDayTasks } from '@/hooks/useDayTasks';
import { useUser } from '@/hooks/useUser';
import {
  appendDayTask,
  getWeekPoints,
  getFocusLeaveEvents,
  saveCustomChallenge,
  saveCustomShopItem,
  saveCustomTemplate,
  scanAllDayTasks,
  seedConfig,
  seedSubjects,
  settleTask,
} from '@/services';
import { todayKey } from '@/utils/date';
import type { Challenge, Redemption, ShopItem, TaskInstance, TaskTemplate } from '@/models';
import './ParentPage.css';

const WEEK_TARGET = 800;

export default function ParentPage() {
  const date = todayKey();
  const { tasks, save } = useDayTasks(date);
  const { user, earn, setRedemptionStatus } = useUser();
  const [reviewing, setReviewing] = useState<TaskInstance | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [praise, setPraise] = useState('');
  const [publishTaskOpen, setPublishTaskOpen] = useState(false);
  const [publishGiftOpen, setPublishGiftOpen] = useState(false);
  const [publishChallengeOpen, setPublishChallengeOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const pendingReview = useMemo(
    () => tasks.filter((t) => t.status === 'awaiting_review'),
    [tasks],
  );
  const pendingRedemption = useMemo(
    () => user.redemptions.filter((r) => r.status === 'pending_review'),
    [user.redemptions],
  );
  const focusLeaveEvents = getFocusLeaveEvents().slice(0, 30);

  // 本周报告：跨天真实数据（周一 00:00 → 周日 23:59）
  const weekReport = useMemo(() => {
    const now = new Date();
    const day = now.getDay() === 0 ? 7 : now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day - 1));
    monday.setHours(0, 0, 0, 0);

    const all = scanAllDayTasks();
    const subjectMap = new Map<string, number>();
    let totalMin = 0;
    let approvedCount = 0;
    for (const [date, list] of Object.entries(all)) {
      if (new Date(date) < monday) continue;
      for (const t of list) {
        if (t.status !== 'approved') continue;
        approvedCount += 1;
        totalMin += Math.round(t.actualSeconds / 60);
        subjectMap.set(t.subject, (subjectMap.get(t.subject) ?? 0) + (t.awardedPoints ?? 0));
      }
    }
    const rows = Array.from(subjectMap.entries()).map(([id, pts]) => ({
      id,
      name: seedSubjects.find((s) => s.id === id)?.name ?? id,
      pts,
    }));
    rows.sort((a, b) => b.pts - a.pts);
    const max = Math.max(WEEK_TARGET / 4, ...rows.map((r) => r.pts));
    return {
      approvedCount,
      totalMin,
      totalPts: getWeekPoints(),
      perSubject: { rows, max },
    };
  }, [tasks]);

  // 兼容原变量名（下面 JSX 引用了这些）
  const approvedToday = tasks.filter((t) => t.status === 'approved');
  void approvedToday;

  function approve(t: TaskInstance) {
    const r = settleTask(t, seedConfig);
    save({
      ...t,
      status: 'approved',
      awardedPoints: r.awardedPoints,
      savedMinutes: r.savedMinutes,
      reviewedAt: Date.now(),
      reviewNote: r.notes.join('；'),
      praise: praise.trim() || undefined,
    });
    earn(r.awardedPoints);
    setReviewing(null);
    setPraise('');
  }

  function reject(t: TaskInstance) {
    save({
      ...t,
      status: 'rejected',
      awardedPoints: 0,
      savedMinutes: 0,
      reviewedAt: Date.now(),
      reviewNote: rejectNote || '需要重做',
    });
    setReviewing(null);
    setRejectNote('');
    setPraise('');
  }

  const reviewContent = (
    <ReviewSection
      pendingReview={pendingReview}
      pendingRedemption={pendingRedemption}
      weekApprovedCount={weekReport.approvedCount}
      weekTotalMin={weekReport.totalMin}
      weekTotalPts={weekReport.totalPts}
      perSubject={weekReport.perSubject}
      onOpenReview={setReviewing}
      onSetRedemption={setRedemptionStatus}
    />
  );

  return (
    <>
      <PageHeader
        variant="parent"
        icon={<ShieldCheck size={20} color="var(--c-yellow)" />}
        title="家长管理端"
        sub="已通过 PIN 验证 · 审核孩子的任务与兑换"
        extra={
          <>
            <Button
              size="middle"
              type="primary"
              icon={<Plus size={15} />}
              style={{ background: 'var(--c-yellow)', borderColor: 'var(--c-yellow)', color: '#5c3d20' }}
              onClick={() => setPublishTaskOpen(true)}
            >发布任务</Button>
            <Button
              size="middle"
              type="primary"
              icon={<Gift size={15} />}
              onClick={() => setPublishGiftOpen(true)}
            >发布礼品</Button>
            <Button
              size="middle"
              type="primary"
              icon={<Trophy size={15} />}
              style={{ background: 'var(--c-orange)', borderColor: 'var(--c-orange)' }}
              onClick={() => setPublishChallengeOpen(true)}
            >发布挑战</Button>
            <div className="parent-lock">
              <KeyRound size={13} color="var(--c-yellow)" />
              <span>修改密码</span>
            </div>
            <div className="parent-lock">
              <Lock size={13} color="var(--c-yellow)" />
              <span>PIN 已解锁</span>
            </div>
          </>
        }
      />

      <div className="page-body parent-page">
        <Tabs
          leafAnimation={false}
          items={[
            { key: 'review', label: '审核 & 报告', children: reviewContent },
            { key: 'advance', label: '💰 预支审核', children: <AdvanceReviewPanel /> },
            { key: 'habits', label: '🏠 习惯管理', children: <HabitsManagePanel /> },
            { key: 'vocab', label: '📖 词表管理', children: <VocabManagePanel /> },
            { key: 'focus-monitor', label: '👁 专注监测', children: <FocusMonitorPanel events={focusLeaveEvents} /> },
            { key: 'settings', label: '📐 模板校准 & 脚手架', children: <ParentSettingsPanel /> },
            { key: 'backup', label: '💾 数据备份', children: <BackupPanel /> },
          ] as TabItem[]}
        />
      </div>

      <PublishTaskModal
        open={publishTaskOpen}
        onClose={() => setPublishTaskOpen(false)}
        onSubmit={(tpl: TaskTemplate, addToToday: boolean) => {
          saveCustomTemplate(tpl);
          if (addToToday) appendDayTask(date, tpl);
          setToast(`任务「${tpl.title}」已${addToToday ? '加入今日 · 保存到模板库' : '保存到模板库'}`);
        }}
      />

      <PublishGiftModal
        open={publishGiftOpen}
        onClose={() => setPublishGiftOpen(false)}
        onSubmit={(item: ShopItem) => {
          saveCustomShopItem(item);
          setToast(`礼品「${item.name}」已上架 · ${item.price} pts`);
        }}
      />

      <PublishChallengeModal
        open={publishChallengeOpen}
        onClose={() => setPublishChallengeOpen(false)}
        onSubmit={(ch: Challenge) => {
          saveCustomChallenge(ch);
          setToast(`挑战「${ch.title}」已发布 · 目标 ${ch.targetTaskCount} 项 · 关联「${ch.reward}」`);
        }}
      />

      {toast && (
        <Modal
          open
          title="✅ 已保存"
          typewriter={false}
          onClose={() => setToast(null)}
          footer={
            <div className="modal-footer">
              <Button type="primary" onClick={() => setToast(null)}>好的</Button>
            </div>
          }
        >
          <div className="modal-body">{toast}</div>
        </Modal>
      )}

      {reviewing && (
        <Modal
          open
          title="家长审核"
          typewriter={false}
          onClose={() => setReviewing(null)}
          footer={
            <div className="modal-footer">
              <Button danger onClick={() => reject(reviewing)}>退回重做</Button>
              <Button type="primary" onClick={() => approve(reviewing)}>通过并入账</Button>
            </div>
          }
        >
          <ReviewBody
            task={reviewing}
            note={rejectNote}
            onNote={setRejectNote}
            praise={praise}
            onPraise={setPraise}
          />
        </Modal>
      )}
    </>
  );
}

function FocusMonitorPanel({ events }: { events: ReturnType<typeof getFocusLeaveEvents> }) {
  return (
    <section className="focus-log">
      <div className="parent-section-head">
        <Eye size={18} color="#8b5a2b" />
        <span className="parent-section-title">最近离开记录</span>
        <div className="parent-section-spacer" />
        <Tag size="small" color="app-orange">{events.length} 条</Tag>
      </div>
      {events.length === 0 ? <div className="parent-empty">暂无专注中离开记录</div> : (
        <div className="focus-log__list">
          {events.map((event) => (
            <Card key={event.id} className="focus-log__item">
              <div className="focus-log__main">
                <strong>{event.taskTitle}</strong>
                <span>{new Date(event.leftAt).toLocaleString('zh-CN')}</span>
              </div>
              <Tag size="small" color={event.durationSeconds && event.durationSeconds >= 60 ? 'app-orange' : 'app-yellow'}>
                {event.durationSeconds ? `离开 ${event.durationSeconds} 秒` : '离开后未返回'}
              </Tag>
              <span className="focus-log__reason">{event.reason === 'heartbeat-gap' ? '后台恢复检测' : '切换/后台'}</span>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

/* ───────── 审核内容抽出组件 ───────── */

interface ReviewSectionProps {
  pendingReview: TaskInstance[];
  pendingRedemption: Redemption[];
  weekApprovedCount: number;
  weekTotalMin: number;
  weekTotalPts: number;
  perSubject: { rows: { id: string; name: string; pts: number }[]; max: number };
  onOpenReview: (t: TaskInstance) => void;
  onSetRedemption: (id: string, status: 'approved' | 'rejected', note?: string) => void;
}

function ReviewSection({
  pendingReview,
  pendingRedemption,
  weekApprovedCount,
  weekTotalMin,
  weekTotalPts,
  perSubject,
  onOpenReview,
  onSetRedemption,
}: ReviewSectionProps) {
  return (
    <>
      <section className="parent-top">
        <div className="parent-col">
          <div className="parent-section-head">
            <ClipboardCheck size={18} color="#8b5a2b" />
            <span className="parent-section-title">待审核任务</span>
            <div className="parent-section-spacer" />
            <Tag size="small" color="app-orange">{pendingReview.length} 项待处理</Tag>
          </div>
          <div className="parent-list">
            {pendingReview.length === 0 ? (
              <div className="parent-empty">当前没有待审核任务 🎉</div>
            ) : (
              pendingReview.map((t) => <ReviewCard key={t.id} task={t} onOpen={() => onOpenReview(t)} />)
            )}
          </div>
        </div>

        <aside className="parent-col parent-col--redeem">
          <div className="parent-section-head">
            <Gift size={18} color="#8b5a2b" />
            <span className="parent-section-title">待兑换审核</span>
            <div className="parent-section-spacer" />
            <Tag size="small">{pendingRedemption.length}</Tag>
          </div>
          <div className="parent-list">
            {pendingRedemption.length === 0 ? (
              <div className="parent-empty">暂无待兑换项</div>
            ) : (
              pendingRedemption.map((r) => (
                <Card key={r.id} className="redeem-card">
                  <div className="redeem-card__top">
                    <span className="redeem-card__name">{r.itemName}</span>
                    <Tag size="small" color="app-yellow">-{r.price} pts</Tag>
                  </div>
                  <div className="redeem-card__meta">{new Date(r.createdAt).toLocaleString('zh-CN')}</div>
                  <div className="redeem-card__actions">
                    <Button size="small" type="primary" onClick={() => onSetRedemption(r.id, 'approved')}>发放</Button>
                    <Button size="small" danger onClick={() => onSetRedemption(r.id, 'rejected', '本周额度已满')}>退回</Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </aside>
      </section>

      <Card color="brown" className="parent-report">
        <Title size="small" color="brown">📊  本周完成报告（周一至今）</Title>
        <div className="parent-report__body">
          <div className="parent-report__stats">
            <div className="parent-stat">
              <div className="parent-stat__value">{weekApprovedCount}</div>
              <div className="parent-stat__label">完成任务</div>
            </div>
            <div className="parent-stat">
              <div className="parent-stat__value">{(weekTotalMin / 60).toFixed(1)}h</div>
              <div className="parent-stat__label">学习时长</div>
            </div>
            <div className="parent-stat">
              <div className="parent-stat__value">+{weekTotalPts}</div>
              <div className="parent-stat__label">本周积分</div>
            </div>
          </div>
          <div className="parent-report__subjects">
            {perSubject.rows.length === 0 && (
              <div className="parent-report__hint">本周暂无入账，等孩子跑动起来 🌱</div>
            )}
            {perSubject.rows.map((r) => (
              <div key={r.id} className="parent-sub-row">
                <span className="parent-sub-row__name">{r.name}</span>
                <div className="parent-sub-row__bar">
                  <div style={{ width: `${(r.pts / perSubject.max) * 100}%` }} />
                </div>
                <span className="parent-sub-row__pts">{r.pts}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </>
  );
}

interface ReviewCardProps { task: TaskInstance; onOpen: () => void }

function ReviewCard({ task, onOpen }: ReviewCardProps) {
  const preview = settleTask(task, seedConfig);
  return (
    <Card className="review-card">
      <div className="review-card__info">
        <div className="review-card__title">{task.title}</div>
        <div className="review-card__meta">
          {'★'.repeat(task.difficulty)}<span style={{ opacity: 0.3 }}>{'★'.repeat(5 - task.difficulty)}</span>
          <span> · 用时 {Math.round(task.actualSeconds / 60)} / 标准 {task.standardMinutes} 分</span>
          {task.pomodoros > 0 && <span> · 🍅 ×{task.pomodoros}</span>}
        </div>
      </div>
      <div className="review-card__preview">
        <div className="review-card__preview-num">+{preview.awardedPoints}</div>
        <div className="review-card__preview-label">预计入账</div>
      </div>
      <div className="review-card__actions">
        <Button size="small" onClick={onOpen}>详情</Button>
      </div>
    </Card>
  );
}

interface ReviewBodyProps {
  task: TaskInstance;
  note: string;
  onNote: (v: string) => void;
  praise: string;
  onPraise: (v: string) => void;
}

function ReviewBody({ task, note, onNote, praise, onPraise }: ReviewBodyProps) {
  const r = settleTask(task, seedConfig);
  const submissionImages = task.submissionImages ?? [];
  const [lightbox, setLightbox] = useState<string | null>(null);
  return (
    <div className="modal-body">
      <p><strong>{task.title}</strong> · 用时 {(task.actualSeconds / 60).toFixed(1)} / 标准 {task.standardMinutes} 分</p>

      {task.submissionText && (
        <div className="review-submission">
          <div className="review-submission__label">📝 孩子的完成说明</div>
          <div className="review-submission__text">{task.submissionText}</div>
        </div>
      )}
      {task.recitationOriginal && (
        <details className="review-recitation">
          <summary>📖 查看背诵原文 · {task.recitationOriginal.title}</summary>
          {task.recitationOriginal.author && (
            <div className="review-recitation__author">{task.recitationOriginal.author}</div>
          )}
          <div className="review-recitation__lines">
            {task.recitationOriginal.lines.map((line, i) => <p key={i}>{line}</p>)}
          </div>
        </details>
      )}
      {submissionImages.length > 0 && (
        <div className="review-submission">
          <div className="review-submission__label">📷 作业照片（点开大图）</div>
          <div className="review-submission__images">
            {submissionImages.map((src, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setLightbox(src)}
                className="review-submission__image-btn"
              >
                <img src={src} alt={`作业 ${i + 1}`} />
              </button>
            ))}
          </div>
        </div>
      )}

      {lightbox && (
        <button
          type="button"
          className="review-lightbox"
          onClick={() => setLightbox(null)}
          aria-label="关闭大图"
        >
          <img src={lightbox} alt="作业照片大图" />
          <span className="review-lightbox__hint">点击任意处关闭</span>
        </button>
      )}

      <ul className="modal-notes">
        {r.notes.map((n, i) => <li key={i}>{n}</li>)}
      </ul>
      <p>预计入账 <strong>+{r.awardedPoints}</strong> 积分 · 时间银行 +{r.savedMinutes.toFixed(1)} 分</p>

      <div className="review-input-row">
        <div className="review-input-row__label">🌟 具体肯定（选填，通过时给孩子）</div>
        <Input
          value={praise}
          onChange={(e) => onPraise(e.target.value)}
          placeholder="例：这篇作文开头比上次有意思"
          allowClear
        />
      </div>

      <div className="review-input-row">
        <div className="review-input-row__label">如需退回，填写原因（选填）</div>
        <Input
          value={note}
          onChange={(e) => onNote(e.target.value)}
          placeholder="例：作文开头再改一改"
          allowClear
        />
      </div>
    </div>
  );
}
