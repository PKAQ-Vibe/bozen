import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, Modal, Radio, Tabs, Tag, Title, Wallet } from 'animal-island-ui';
import type { TabItem } from 'animal-island-ui';
import { BookMarked, CalendarCheck, Check, Plus, Rocket, Timer } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import SubmissionModal from '@/components/modals/SubmissionModal';
import { useDayTasks } from '@/hooks/useDayTasks';
import { useUser } from '@/hooks/useUser';
import {
  computeChallengeProgress,
  getActiveChallenges,
  getAllTemplates,
  getAllUnits,
  pickTaskForToday,
  scanAllInstances,
  seedConfig,
  settleTask,
  unpickTaskForToday,
} from '@/services';
import { todayKey } from '@/utils/date';
import type { SubjectId, TaskInstance, TaskStatus, TaskTemplate } from '@/models';
import './TasksPage.css';

const BUCKETS: { key: 'homework' | 'boost' | 'extend'; label: string; kind: 'required' | 'challenge' | 'optional'; hint: string }[] = [
  { key: 'homework', label: '作业', kind: 'required', hint: '学校暑假作业清单' },
  { key: 'boost', label: '提升', kind: 'challenge', hint: '辅导班 / 提前学 / 挑战' },
  { key: 'extend', label: '拓展', kind: 'optional', hint: '选做鉴赏 / 兴趣延伸' },
];

const SUBJECT_META: Record<string, { label: string; emoji: string }> = {
  chinese: { label: '语文', emoji: '📖' },
  math: { label: '数学', emoji: '➗' },
  english: { label: '英语', emoji: '📚' },
  physics: { label: '物理', emoji: '🔬' },
  chemistry: { label: '化学', emoji: '🧪' },
  history: { label: '历史', emoji: '📜' },
  geography: { label: '地理', emoji: '🌍' },
  politics: { label: '政治', emoji: '🏛' },
  biology: { label: '生物', emoji: '🌱' },
  habit: { label: '生活', emoji: '🏠' },
};

const STATUS_RANK: Record<TaskStatus, number> = {
  approved: 4,
  awaiting_review: 3,
  in_progress: 2,
  rejected: 1,
  pending: 0,
};

const SUBJECT_FILTERS: { key: SubjectId; label: string }[] = [
  { key: 'chinese', label: '语文' },
  { key: 'math', label: '数学' },
  { key: 'english', label: '英语' },
  { key: 'physics', label: '物理' },
  { key: 'chemistry', label: '化学' },
  { key: 'history', label: '历史' },
  { key: 'geography', label: '地理' },
  { key: 'politics', label: '政治' },
  { key: 'biology', label: '生物' },
  { key: 'habit', label: '生活' },
];

// 分类展示顺序（学科内二级分组）· 补习班/单词背诵/每日复背/每日习惯排在最上，让"每日必做"最先看到
const CATEGORY_ORDER = [
  '补习班', '单词背诵', '每日复背', '每日习惯',
  '背默译', '名著阅读', '读书笔记', '旅游实践', '拓展鉴赏',
  '课文熟读', '单词默写', '套题', '社会实践',
  '期末试题', '复习', '单元卷', '预习',
  '家庭实践', '选做作业', '短视频实践', '实践模型',
  '其他', '挑战', '选做',
];
function categoryRank(c: string | undefined): number {
  const i = CATEGORY_ORDER.indexOf(c ?? '其他');
  return i < 0 ? 999 : i;
}

export default function TasksPage() {
  const date = todayKey();
  const { tasks, save } = useDayTasks(date);
  const { user, earn } = useUser();
  const navigate = useNavigate();

  const [filter, setFilter] = useState<SubjectId>('chinese');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleCollapse = (cat: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };
  const [slackTask, setSlackTask] = useState<TaskInstance | null>(null);
  const [slackChoice, setSlackChoice] = useState(0);
  const [reviewing, setReviewing] = useState<TaskInstance | null>(null);
  const [directTask, setDirectTask] = useState<TaskInstance | null>(null);

  const isDone = (t: TaskInstance) => t.status === 'approved' || t.status === 'awaiting_review';

  const visibleTasks = useMemo(
    () => tasks.filter((t) => t.subject === filter),
    [tasks, filter],
  );

  // 今日"已选" = pickedAt 有值的（每日任务自动选入 + 一次性作业孩子手动选入）
  const engagedTasks = useMemo(
    () => tasks.filter((t) => t.pickedAt !== undefined),
    [tasks],
  );

  function togglePick(t: TaskInstance) {
    const updated = t.pickedAt !== undefined
      ? unpickTaskForToday(date, t.id)
      : pickTaskForToday(date, t.id);
    if (updated) save(updated);
  }

  // 学科内按 category 二级分组
  const grouped = useMemo(() => {
    const groups = new Map<string, TaskInstance[]>();
    for (const t of visibleTasks) {
      const cat = t.category ?? '其他';
      const list = groups.get(cat) ?? [];
      list.push(t);
      groups.set(cat, list);
    }
    return Array.from(groups.entries()).sort(
      ([a], [b]) => categoryRank(a) - categoryRank(b),
    );
  }, [visibleTasks]);

  const totalPts = engagedTasks.reduce((acc, t) => acc + t.basePoints, 0);
  const earnedPts = tasks
    .filter((t) => t.status === 'approved')
    .reduce((acc, t) => acc + (t.awardedPoints ?? 0), 0);
  const totalMinutes = engagedTasks.reduce((acc, t) => acc + t.standardMinutes, 0);
  const selectedCount = engagedTasks.length;
  const requiredCount = tasks.filter((t) => t.kind === 'required').length;
  const challengeTasks = tasks.filter((t) => t.kind === 'challenge');

  const weeklyTarget = 800;
  const weeklyProgress = Math.min(100, (earnedPts / weeklyTarget) * 100);

  function startTask(t: TaskInstance) {
    // 有内部路由：直接跳（孩子自己在页面里挑单元/数量）
    if (t.link) {
      navigate(t.link);
      return;
    }
    if (t.status === 'in_progress') {
      navigate(`/focus/${t.id}`);
      return;
    }
    setSlackChoice(t.slackMinutes);
    setSlackTask(t);
  }

  function lockSlackAndGo() {
    if (!slackTask) return;
    save({
      ...slackTask,
      slackMinutes: slackChoice,
      status: 'in_progress',
      startedAt: Date.now(),
    });
    navigate(`/focus/${slackTask.id}`);
    setSlackTask(null);
  }

  function approve(t: TaskInstance) {
    const r = settleTask(t, seedConfig);
    save({
      ...t,
      status: 'approved',
      awardedPoints: r.awardedPoints,
      savedMinutes: r.savedMinutes,
      reviewedAt: Date.now(),
      reviewNote: r.notes.join('；'),
    });
    earn(r.awardedPoints);
    setReviewing(null);
  }

  function reject(t: TaskInstance, note: string) {
    save({
      ...t,
      status: 'rejected',
      awardedPoints: 0,
      savedMinutes: 0,
      reviewedAt: Date.now(),
      reviewNote: note || '需要重做',
    });
    setReviewing(null);
  }

  function completeDirect(submissionText: string, submissionImages: string[]) {
    if (!directTask) return;
    save({
      ...directTask,
      pickedAt: directTask.pickedAt ?? Date.now(),
      status: 'awaiting_review',
      completedAt: Date.now(),
      submissionText: submissionText || undefined,
      submissionImages: submissionImages.length > 0 ? submissionImages : undefined,
      finishedInPomodoro: false,
    });
    setDirectTask(null);
  }

  return (
    <>
      <PageHeader
        title="选课中心"
        sub="每周自主规划，难度越高积分越多"
        extra={
          <div className="weekly-budget">
            <span className="weekly-budget__label">本周积分</span>
            <span className="weekly-budget__value">{earnedPts} / {weeklyTarget} pts</span>
            <div className="weekly-budget__bar"><div style={{ width: `${weeklyProgress}%` }} /></div>
          </div>
        }
      />

      <div className="page-body tasks-page">
        {/* 总览带（横跨两栏） */}
        <TaskOverview />

        {/* 左列：任务库 */}
        <section className="tasks-col tasks-col--lib">
          <div className="tasks-section-head">
            <BookMarked size={18} color="var(--c-blue)" />
            <span className="tasks-section-title">任务库</span>
            <div className="tasks-section-spacer" />
            <Tag size="small" color="app-red">必修 {requiredCount}</Tag>
          </div>

          {/* SubjTabs — island Tabs */}
          <Tabs
            activeKey={filter}
            onChange={(k) => setFilter(k as SubjectId)}
            leafAnimation={false}
            items={SUBJECT_FILTERS.map<TabItem>((s) => ({
              key: s.key,
              label: s.label,
              children: (
                <div className="tasks-modules">
                  {grouped.length === 0 && (
                    <div className="tasks-empty">该分组下没有任务</div>
                  )}
                  {grouped.map(([cat, list]) => {
                    const req = list.filter((t) => t.kind === 'required');
                    const opt = list.filter((t) => t.kind === 'optional');
                    const cha = list.filter((t) => t.kind === 'challenge');
                    const reqDone = req.filter(isDone).length;
                    const optDone = opt.filter(isDone).length;
                    const chaDone = cha.filter(isDone).length;
                    const allDaily = list.every((t) => !t.once);
                    const isOpen = !collapsed.has(cat);
                    return (
                      <Card key={cat} className="tasks-module">
                        <button
                          type="button"
                          className="tasks-module__head tasks-module__head--btn"
                          onClick={() => toggleCollapse(cat)}
                        >
                          <span className={`tasks-module__caret ${isOpen ? 'is-open' : ''}`}>▶</span>
                          <span className="tasks-module__name">{cat}</span>
                          {allDaily && <span className="tasks-module__daily-badge">每日</span>}
                          <div className="tasks-section-spacer" />
                          {req.length > 0 && (
                            <KindStat label="必做" color="app-red" done={reqDone} total={req.length} barColor="var(--c-red)" />
                          )}
                          {opt.length > 0 && (
                            <KindStat label="选做" color="app-yellow" done={optDone} total={opt.length} barColor="var(--c-yellow)" />
                          )}
                          {cha.length > 0 && (
                            <KindStat label="挑战" color="purple" done={chaDone} total={cha.length} barColor="var(--c-purple)" />
                          )}
                        </button>
                        {isOpen && list.map((t) => (
                          <TaskLibRow
                            key={t.id}
                            task={t}
                            onAction={() => startTask(t)}
                            onReview={() => setReviewing(t)}
                            onTogglePick={() => togglePick(t)}
                            onComplete={() => setDirectTask(t)}
                          />
                        ))}
                      </Card>
                    );
                  })}
                </div>
              ),
            }))}
          />
        </section>

        {/* 右列：本周课表 */}
        <section className="tasks-col tasks-col--plan">
          <div className="tasks-section-head">
            <CalendarCheck size={18} color="var(--c-orange)" />
            <span className="tasks-section-title">今日已选</span>
            <div className="tasks-section-spacer" />
            <Tag size="small" color="app-orange">{selectedCount} 项</Tag>
          </div>

          <Card className="plan-list">
            {engagedTasks.length === 0 && (
              <div className="tasks-empty" style={{ padding: '20px 12px' }}>
                今天还没选任务 · 点左侧任务库里的「开始」加进来
              </div>
            )}
            {engagedTasks.map((t) => {
              const done = t.status === 'approved';
              const inReview = t.status === 'awaiting_review';
              const rejected = t.status === 'rejected';
              const label = done ? '已通过' : inReview ? '待审核' : rejected ? '退回' : '进行中';
              const color = done ? 'app-green' : inReview ? 'app-yellow' : rejected ? 'app-red' : 'default';
              return (
                <div key={t.id} className="plan-item">
                  <span className="plan-item__day">今日</span>
                  <span className="plan-item__title">{t.title}</span>
                  <Tag size="small" color={color}>{label} · +{t.basePoints}</Tag>
                </div>
              );
            })}
          </Card>

          {/* Summary */}
          <Card className="plan-sum">
            <div className="plan-sum__cell">
              <div className="plan-sum__label">预计积分</div>
              <div className="plan-sum__val">{totalPts} pts</div>
            </div>
            <div className="plan-sum__cell">
              <div className="plan-sum__label">已选任务</div>
              <div className="plan-sum__val">{selectedCount} 项</div>
            </div>
            <div className="plan-sum__cell">
              <div className="plan-sum__label">预计时间</div>
              <div className="plan-sum__val">{totalMinutes} 分</div>
            </div>
          </Card>

          {/* 挑战通道（§6.1）· 挂接限时挑战当前进度 */}
          <Card color="app-yellow" pattern="app-yellow" className="challenge-channel">
            <div className="tasks-section-head">
              <Rocket size={16} color="var(--c-yellow)" />
              <Title size="small" color="app-yellow">挑战通道</Title>
            </div>
            {(() => {
              const active = getActiveChallenges()[0];
              if (!active) {
                return (
                  <div className="challenge-channel__desc">
                    完成必选任务后开启 · 主动加做或挑战高难度，获得不封顶的主动性加成 🚀
                  </div>
                );
              }
              const { progress } = computeChallengeProgress(active, tasks);
              return (
                <div className="challenge-channel__active">
                  <div className="challenge-channel__desc">
                    {active.emoji} <strong>{active.title}</strong> · 达成解锁「{active.reward}」
                  </div>
                  <div className="challenge-channel__bar">
                    <div style={{ width: `${(progress / active.targetTaskCount) * 100}%` }} />
                  </div>
                  <div className="challenge-channel__meta">
                    完成挑战任务 {progress} / {active.targetTaskCount} · 距关闭 {Math.max(0, Math.ceil((active.endAt - Date.now()) / 86400000))} 天
                  </div>
                </div>
              );
            })()}
            <div className="challenge-channel__list">
              {challengeTasks.length === 0 && (
                <div className="tasks-empty">暂无挑战任务，等待解锁</div>
              )}
              {challengeTasks.map((t) => (
                <div key={t.id} className="challenge-channel__item">
                  <Plus size={14} color="var(--c-yellow)" />
                  <span style={{ flex: 1 }}>{t.title}</span>
                  <Tag size="small" color="app-yellow" variant="solid">+{t.basePoints} · {Math.round(seedConfig.challengeBonusRatio * 100)}%</Tag>
                </div>
              ))}
            </div>
          </Card>

          <div className="tasks-col__spacer" />

          <Link to="/">
            <Button type="primary" block size="large">
              🏠  返回首页看进度
            </Button>
          </Link>
          <div className="tasks-page__user-meta">
            <span>当前余额</span>
            <Wallet value={user.points} size="small" icon={<span style={{ fontSize: 20 }}>⭐</span>} />
          </div>
        </section>
      </div>

      {/* Slack 时间锁定 modal */}
      {slackTask && (
        <Modal
          open
          title="锁定宽松时间"
          typewriter={false}
          onClose={() => setSlackTask(null)}
          footer={
            <div className="modal-footer">
              <Button onClick={() => setSlackTask(null)}>取消</Button>
              <Button type="primary" onClick={lockSlackAndGo}>锁定 {slackChoice} 分并开始</Button>
            </div>
          }
        >
          <SlackBody task={slackTask} value={slackChoice} onChange={setSlackChoice} />
        </Modal>
      )}

      {/* Review modal */}
      {reviewing && (
        <Modal
          open
          title="家长审核"
          typewriter={false}
          onClose={() => setReviewing(null)}
          footer={
            <div className="modal-footer">
              <Button danger onClick={() => reject(reviewing, '需要重做')}>退回重做</Button>
              <Button type="primary" onClick={() => approve(reviewing)}>通过并入账</Button>
            </div>
          }
        >
          <ReviewBody task={reviewing} />
        </Modal>
      )}

      {directTask && (
        <SubmissionModal
          open
          taskTitle={directTask.title}
          initialText={directTask.submissionText}
          initialImages={directTask.submissionImages}
          onClose={() => setDirectTask(null)}
          onSubmit={({ text, images }) => completeDirect(text, images)}
        />
      )}

    </>
  );
}

/* ───────── 单词背诵快选 modal（保留备用，当前流程不再弹） ───────── */

// @ts-expect-error 保留备用组件，当前 startTask 直接跳转不再调用
function _VocabPickModal({ task, onClose, onStart }: {
  task: TaskInstance;
  onClose: () => void;
  onStart: (unitId: string, count: number) => void;
}) {
  const units = useMemo(() => getAllUnits(), []);
  // 从 task.link 里解析默认单元（如 /vocab/eng-8up-u1）
  const defaultUnit = task.link?.match(/^\/vocab\/([^/?]+)/)?.[1] ?? units[0]?.id ?? '';
  const [unitId, setUnitId] = useState(defaultUnit);
  const [count, setCount] = useState<number>(15);
  const [custom, setCustom] = useState('');

  return (
    <Modal
      open
      title="选择今日背诵内容"
      typewriter={false}
      onClose={onClose}
      width={480}
      footer={
        <div className="modal-footer">
          <Button onClick={onClose}>取消</Button>
          <Button
            type="primary"
            disabled={!unitId}
            onClick={() => onStart(unitId, custom ? Number(custom) : count)}
          >
            开始背诵
          </Button>
        </div>
      }
    >
      <div className="vocab-pick-modal">
        <div className="vocab-pick-modal__label">📖 选择单元</div>
        <div className="vocab-pick-modal__units">
          {units.map((u) => (
            <button
              key={u.id}
              type="button"
              className={`vocab-pick-unit ${unitId === u.id ? 'is-active' : ''}`}
              onClick={() => setUnitId(u.id)}
            >
              <span className="vocab-pick-unit__no">{u.no}</span>
              <span className="vocab-pick-unit__title">{u.title}</span>
              <span className="vocab-pick-unit__count">{u.words.length} 词</span>
            </button>
          ))}
        </div>

        <div className="vocab-pick-modal__label" style={{ marginTop: 14 }}>🎯 今日数量</div>
        <div className="vocab-pick-modal__counts">
          {[0, 10, 15, 20].map((n) => (
            <button
              key={n}
              type="button"
              className={`vocab-count-chip ${count === n && !custom ? 'is-active' : ''}`}
              onClick={() => { setCount(n); setCustom(''); }}
            >
              {n === 0 ? '今日 due 全部' : `${n} 词`}
            </button>
          ))}
          <input
            type="number"
            min={1}
            max={200}
            className="vocab-count-picker__custom"
            placeholder="自定义 N"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
        </div>
        <div className="vocab-pick-modal__hint">📎 任务：{task.title}</div>
      </div>
    </Modal>
  );
}

/* ───────────── 子组件 ───────────── */

interface RowProps {
  task: TaskInstance;
  onAction: () => void;
  onReview: () => void;
  onTogglePick: () => void;
  onComplete: () => void;
}

function TaskLibRow({ task, onAction, onReview, onTogglePick, onComplete }: RowProps) {
  const done = task.status === 'approved';
  const awaiting = task.status === 'awaiting_review';
  const running = task.status === 'in_progress';
  const isDaily = task.once !== true;
  const picked = task.pickedAt !== undefined;
  // 只有 pending / rejected 状态下才允许 pick↔unpick；每日任务系统托管，不给撤
  const pickLocked = done || awaiting || running || isDaily;
  const pickTitle = isDaily
    ? '每日任务 · 系统自动选入，不可撤回'
    : (picked ? (pickLocked ? '已选入 · 已开始/已提交，不可撤回' : '已选入今日 · 点击撤回') : '选入今日');

  return (
    <div className={`lib-row ${done ? 'lib-row--done' : ''} ${picked ? 'lib-row--picked' : ''}`}>
      <button
        type="button"
        className={`lib-row__pick ${picked ? 'lib-row__pick--on' : ''}`}
        onClick={onTogglePick}
        title={pickTitle}
        disabled={pickLocked}
      >
        {picked ? '✓' : '+'}
      </button>
      <div className="lib-row__info">
        <div className="lib-row__title">
          {task.title}
          {!task.once && <span className="lib-row__daily-tag">每日</span>}
        </div>
        <div className="lib-row__meta">
          {'★'.repeat(task.difficulty)}<span style={{ opacity: 0.3 }}>{'★'.repeat(5 - task.difficulty)}</span>
          <span> · 标准 {task.standardMinutes} 分</span>
        </div>
      </div>
      <Tag size="small" color={done ? 'app-green' : 'default'}>+{task.basePoints} pts</Tag>
      {picked && !done && !awaiting && (
        <Button size="small" type="primary" icon={<Timer size={13} />} onClick={onAction}>
          {running ? '继续' : '开始'}
        </Button>
      )}
      {!done && !awaiting && (
        <Button size="small" icon={<Check size={13} />} onClick={onComplete}>
          完成
        </Button>
      )}
      {awaiting && (
        <Button size="small" onClick={onReview}>家长审核</Button>
      )}
    </div>
  );
}

interface SlackProps {
  task: TaskInstance;
  value: number;
  onChange: (v: number) => void;
}

function SlackBody({ task, value, onChange }: SlackProps) {
  const max = Math.floor(task.standardMinutes * seedConfig.slackMaxRatio);
  const choices = Array.from(new Set([0, Math.max(1, Math.floor(max / 3)), Math.max(2, Math.floor((2 * max) / 3)), max]))
    .sort((a, b) => a - b);
  return (
    <div className="modal-body">
      <p>「{task.title}」标准 <strong>{task.standardMinutes}</strong> 分。宽松时间上限 <strong>{max}</strong> 分（标准 ×20%）。</p>
      <Radio
        value={value}
        onChange={(v) => onChange(Number(v))}
        direction="vertical"
        options={choices.map((m) => ({
          label: m === 0 ? '不设宽松（高风险高回报）' : `+${m} 分（求稳）`,
          value: m,
        }))}
      />
      <p className="modal-hint">
        不设：超时 0-10% 仅扣 1/3；提前价值全归时间银行。<br />
        设了：宽松内完成保底基础分 ×1/2，但放弃提前翻倍。
      </p>
    </div>
  );
}

function KindStat({ label, color, done, total, barColor }: {
  label: string;
  color: 'app-red' | 'app-yellow' | 'purple';
  done: number;
  total: number;
  barColor: string;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <span className="kind-stat" onClick={(e) => e.stopPropagation()}>
      <Tag size="small" color={color}>{label} {done}/{total}</Tag>
      <span className="kind-stat__bar" title={`${pct}%`}>
        <span style={{ width: `${pct}%`, background: barColor }} />
      </span>
      <span className="kind-stat__pct">{pct}%</span>
    </span>
  );
}

function ReviewBody({ task }: { task: TaskInstance }) {
  const r = settleTask(task, seedConfig);
  return (
    <div className="modal-body">
      <p><strong>{task.title}</strong> · 实际用时 {(task.actualSeconds / 60).toFixed(1)} 分 / 标准 {task.standardMinutes} 分</p>
      <ul className="modal-notes">
        {r.notes.map((n, i) => <li key={i}>{n}</li>)}
      </ul>
      <p>预计入账 <strong>+{r.awardedPoints}</strong> 积分 · 时间银行 +{r.savedMinutes.toFixed(1)} 分</p>
    </div>
  );
}

/* ───────── 总览：作业 / 提升 / 拓展 + 学科热力图 ───────── */

function TaskOverview() {
  // 只统计一次性作业（once === true），每日任务不掺进"暑假总量"里稀释比例
  const templates = useMemo(() => getAllTemplates().filter((t) => t.once === true), []);
  const bestStatus = useMemo(() => {
    const map = new Map<string, TaskStatus>();
    for (const inst of scanAllInstances()) {
      const cur = map.get(inst.templateId);
      if (!cur || STATUS_RANK[inst.status] > STATUS_RANK[cur]) map.set(inst.templateId, inst.status);
    }
    return map;
  }, []);

  return (
    <Card className="overview-band">
      <div className="overview-band__head">
        <span className="overview-band__icon">📊</span>
        <Title size="small" color="app-green">暑假任务总览</Title>
        <div className="overview-band__spacer" />
        <span className="overview-legend">
          <span className="overview-sq overview-sq--approved" /> 通过
          <span className="overview-sq overview-sq--awaiting_review" /> 待审
          <span className="overview-sq overview-sq--in_progress" /> 进行
          <span className="overview-sq overview-sq--rejected" /> 退回
          <span className="overview-sq overview-sq--pending" /> 未做
        </span>
      </div>

      <div className="overview-buckets">
        {BUCKETS.map((b) => {
          const bucketTpls = templates.filter((t) => t.kind === b.kind);
          return (
            <OverviewBucket
              key={b.key}
              label={b.label}
              hint={b.hint}
              templates={bucketTpls}
              bestStatus={bestStatus}
            />
          );
        })}
      </div>
    </Card>
  );
}

interface OverviewBucketProps {
  label: string;
  hint: string;
  templates: TaskTemplate[];
  bestStatus: Map<string, TaskStatus>;
}

function OverviewBucket({ label, hint, templates, bestStatus }: OverviewBucketProps) {
  // 按学科分组
  const bySubject = useMemo(() => {
    const m = new Map<string, TaskTemplate[]>();
    for (const t of templates) {
      const list = m.get(t.subject) ?? [];
      list.push(t);
      m.set(t.subject, list);
    }
    return Array.from(m.entries());
  }, [templates]);

  const total = templates.length;
  const done = templates.filter((t) => {
    const s = bestStatus.get(t.id);
    return s === 'approved' || s === 'awaiting_review';
  }).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="overview-bucket">
      <div className="overview-bucket__head">
        <span className="overview-bucket__label">{label}</span>
        <span className="overview-bucket__hint">{hint}</span>
        <div className="tasks-section-spacer" />
        <span className="overview-bucket__pct">{done}/{total} · {pct}%</span>
      </div>
      <div className="overview-bucket__bar">
        <div style={{ width: `${pct}%` }} />
      </div>
      {bySubject.length === 0 ? (
        <div className="overview-bucket__empty">暂无{label}任务</div>
      ) : (
        <div className="overview-subjects">
          {bySubject.map(([sub, list]) => {
            const meta = SUBJECT_META[sub] ?? { label: sub, emoji: '📌' };
            const subDone = list.filter((t) => {
              const s = bestStatus.get(t.id);
              return s === 'approved' || s === 'awaiting_review';
            }).length;
            return (
              <div key={sub} className="overview-subject">
                <div className="overview-subject__label">
                  <span>{meta.emoji}</span>
                  <span>{meta.label}</span>
                  <span className="overview-subject__count">{subDone}/{list.length}</span>
                </div>
                <div className="overview-grid">
                  {list.map((t) => {
                    const s = bestStatus.get(t.id) ?? 'pending';
                    return (
                      <span
                        key={t.id}
                        className={`overview-sq overview-sq--${s}`}
                        title={`${t.title} · ${STATUS_LABEL[s]}`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const STATUS_LABEL: Record<TaskStatus, string> = {
  approved: '通过',
  awaiting_review: '待审核',
  in_progress: '进行中',
  rejected: '退回',
  pending: '未做',
};
