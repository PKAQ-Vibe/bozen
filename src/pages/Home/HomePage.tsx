import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Checkbox, Divider, Tag, Title, Wallet } from 'animal-island-ui';
import {
  ArrowRight,
  Check,
  CircleCheckBig,
  ClipboardList,
  GitFork,
  Play,
  Timer,
} from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import ToastModal from '@/components/modals/ToastModal';
import {
  computeChallengeProgress,
  getActiveChallenges,
  getAllHabits,
  getHabitsDone,
  submitHabitsForReview,
  syncHabitsTask,
  getRankByPoints,
  getStreakDays,
  getSubjectProgress,
  getTotalApproved,
  isAchieved,
  isDayCheckedIn,
  markAchieved,
  toggleHabitDone,
} from '@/services';

const isDayCheckedInSync = isDayCheckedIn;
import { useDayTasks } from '@/hooks/useDayTasks';
import { useUser } from '@/hooks/useUser';
import { todayKey } from '@/utils/date';
import type { Challenge, TaskInstance } from '@/models';
import './HomePage.css';

function fmtCountdown(msLeft: number): string {
  if (msLeft <= 0) return '已关闭';
  const d = Math.floor(msLeft / 86_400_000);
  const h = Math.floor((msLeft % 86_400_000) / 3_600_000);
  const m = Math.floor((msLeft % 3_600_000) / 60_000);
  if (d > 0) return `${d}天 ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

const SUBJECT_COLORS: Record<string, string> = {
  chinese: 'var(--c-orange)',
  math: 'var(--c-red)',
  english: 'var(--c-green)',
  physics: 'var(--c-blue)',
  chemistry: 'var(--c-purple)',
  reading: 'var(--c-orange)',
  habit: 'var(--c-yellow)',
};

const SUBJECT_LABELS: Record<string, string> = {
  chinese: '语文', math: '数学', english: '英语',
  physics: '物理', chemistry: '化学', politics: '政治',
  history: '历史', geography: '地理', biology: '生物',
  reading: '阅读', sports: '运动', habit: '习惯',
};

export default function HomePage() {
  const date = todayKey();
  const { tasks: allTasks } = useDayTasks(date);
  const { user } = useUser();

  // 首页"今日任务" = 孩子已选入的（每日任务自动选入 + 手动挑选的暑假作业）
  const tasks = useMemo(() => allTasks.filter((t) => t.pickedAt !== undefined), [allTasks]);
  const completed = tasks.filter((t) => t.status === 'approved' || t.status === 'awaiting_review');
  const firstPending = tasks.find((t) => t.status === 'pending' || t.status === 'in_progress');

  // 连续打卡 · 暑假进度 · 技能点 全部从本地加密存储扫描
  const streakDays = useMemo(() => getStreakDays(date), [date, tasks]);
  const subjectProgress = useMemo(() => getSubjectProgress(), [tasks]);
  const totalApproved = useMemo(() => getTotalApproved(), [tasks]);
  const skillPoints = Math.floor(totalApproved / 3);

  const progressRows = useMemo(() => {
    const rows = Object.entries(subjectProgress)
      .filter(([_, v]) => v.total > 0)
      .map(([sub, v]) => ({
        name: SUBJECT_LABELS[sub] ?? sub,
        pct: v.pct,
        color: SUBJECT_COLORS[sub] ?? 'var(--c-mid)',
      }));
    // 保持稳定顺序：语数英物化
    const order = ['语文', '数学', '英语', '物理', '化学', '生物'];
    rows.sort((a, b) => (order.indexOf(a.name) + 999) - (order.indexOf(b.name) + 999));
    return rows.slice(0, 6);
  }, [subjectProgress]);

  const overallPct = useMemo(() => {
    const all = Object.values(subjectProgress);
    const totalTotal = all.reduce((a, v) => a + v.total, 0);
    const totalDone = all.reduce((a, v) => a + v.done, 0);
    return totalTotal > 0 ? Math.round((totalDone / totalTotal) * 100) : 0;
  }, [subjectProgress]);

  // 生活习惯：真实数据 + 每日勾选
  const habits = useMemo(() => getAllHabits(), []);
  const [habitsDone, setHabitsDone] = useState<string[]>(() => getHabitsDone(date));
  const doneCount = habits.filter((h) => habitsDone.includes(h.id)).length;
  const habitTaskStatus = tasks.find((t) => t.id === `habits-daily-${date}`)?.status ?? 'pending';
  const habitSubmitted = habitTaskStatus === 'awaiting_review' || habitTaskStatus === 'approved';

  // 首次进入 → 确保 habits-daily 任务存在
  useMemo(() => { syncHabitsTask(date); }, [date]);

  function onHabitToggle(next: (string | number)[]) {
    if (habitSubmitted) return; // 已提交后不能改
    const strKeys = next.map(String);
    const oldSet = new Set(habitsDone);
    const newSet = new Set(strKeys);
    for (const id of newSet) if (!oldSet.has(id)) toggleHabitDone(date, id);
    for (const id of oldSet) if (!newSet.has(id)) toggleHabitDone(date, id);
    setHabitsDone(strKeys);
  }

  const [homeToast, setHomeToast] = useState<string | null>(null);

  function submitHabits() {
    if (doneCount === 0) { setHomeToast('还没勾选任何习惯 · 先勾几个再提交'); return; }
    submitHabitsForReview(date);
    setHomeToast(`✅ 已提交今日 ${doneCount} 项习惯 · 等家长审核入账`);
  }

  // ── 限时挑战（§七 7.2）：动态取第一条生效挑战 ──
  const challenges = getActiveChallenges();
  const primaryChallenge: Challenge | null = challenges[0] ?? null;
  let challengeProgress = 0;
  let challengeAchievedFirstTime = false;
  if (primaryChallenge) {
    const r = computeChallengeProgress(primaryChallenge, tasks);
    challengeProgress = r.progress;
    if (r.achieved && !isAchieved(primaryChallenge.id)) {
      // 首次达成：本地标记一次即可，不入积分
      challengeAchievedFirstTime = markAchieved(primaryChallenge.id);
    }
  }
  const challengePct = primaryChallenge
    ? (challengeProgress / primaryChallenge.targetTaskCount) * 100
    : 0;
  const challengeAchieved = primaryChallenge ? isAchieved(primaryChallenge.id) : false;

  return (
    <>
      <PageHeader
        title="早上好，小明同学！"
        sub={streakDays > 0 ? `今天是第 ${streakDays} 天连续打卡  🔥` : '还没有开始连续打卡 · 完成一个任务开始吧'}
        extra={
          <>
            <Wallet value={user.points} size="small" icon={<span style={{ fontSize: 22 }}>⭐</span>} />
            <Tag color="purple" variant="outlined" size="medium">
              {getRankByPoints(user.points).emoji} {getRankByPoints(user.points).label}
            </Tag>
          </>
        }
      />
      <div className="page-body home">
      {/* ───── 限时挑战横幅（§七 7.2） ───── */}
      {primaryChallenge && (
        <div className={`challenge-banner ${challengeAchieved ? 'challenge-banner--done' : ''}`}>
          <div className="challenge-banner__icon">{primaryChallenge.emoji}</div>
          <div className="challenge-banner__info">
            <div className="challenge-banner__title-row">
              <span className="challenge-banner__title">{primaryChallenge.title}</span>
              {challengeAchieved ? (
                <Tag size="small" color="app-green" variant="solid">🎉 已解锁</Tag>
              ) : (
                <Tag size="small" color="app-red" variant="solid">NEW</Tag>
              )}
            </div>
            <div className="challenge-banner__sub">{primaryChallenge.subtitle}</div>
            <div className="challenge-banner__progress-row">
              <span className="challenge-banner__progress-label">
                {challengeAchieved
                  ? `已达成 · 关联奖励：${primaryChallenge.reward}`
                  : `完成高质量任务 ${challengeProgress}/${primaryChallenge.targetTaskCount}`}
              </span>
              <div className="challenge-banner__progress-bar">
                <div className="challenge-banner__progress-fill" style={{ width: `${challengePct}%` }} />
              </div>
            </div>
          </div>
          <div className="challenge-banner__countdown">
            <div className="challenge-banner__cd-label">⏰ 距关闭</div>
            <div className="challenge-banner__cd-value">{fmtCountdown(primaryChallenge.endAt - Date.now())}</div>
          </div>
          <Link to="/tasks">
            <Button
              type="primary"
              size="middle"
              icon={<ArrowRight size={15} />}
              disabled={challengeAchieved}
            >
              {challengeAchieved ? '已解锁' : '去冲刺'}
            </Button>
          </Link>
        </div>
      )}
      {challengeAchievedFirstTime && (
        <Card color="app-green" pattern="app-green" className="challenge-toast">
          🎉 恭喜！挑战「{primaryChallenge!.title}」已达成，关联奖励「{primaryChallenge!.reward}」已解锁。
        </Card>
      )}

      {/* ───── 连续打卡条 ───── */}
      <div className="streak-banner">
        <div className="streak-banner__fire">🔥</div>
        <div className="streak-banner__info">
          <div className="streak-banner__title">
            {streakDays > 0 ? `连续打卡 ${streakDays} 天！` : '开启连续打卡之旅'}
          </div>
          <div className="streak-banner__sub">
            今日完成 {completed.length} / {tasks.length} 个任务
            {tasks.length > completed.length && `，再完成 ${tasks.length - completed.length} 个继续保持 🎁`}
          </div>
        </div>
        <div className="streak-banner__spacer" />
        <div className="streak-banner__week">
          {WEEK_LABELS.map((label, i) => {
            // 本周周一到周日，检查每天是否打卡（用真实数据）
            const anchor = new Date(date);
            const day = anchor.getDay() === 0 ? 7 : anchor.getDay();
            const monday = new Date(anchor);
            monday.setDate(anchor.getDate() - (day - 1));
            const cell = new Date(monday);
            cell.setDate(monday.getDate() + i);
            const isToday = cell.toDateString() === new Date(date).toDateString();
            const isFuture = cell > new Date(date);
            const yyyy = cell.getFullYear();
            const mm = String(cell.getMonth() + 1).padStart(2, '0');
            const dd = String(cell.getDate()).padStart(2, '0');
            const cellDate = `${yyyy}-${mm}-${dd}`;
            const done = !isFuture && !isToday && isDayCheckedInSync(cellDate);
            return (
              <div key={label} className="streak-week__day">
                <div className={`streak-week__dot ${isToday ? 'streak-week__dot--today' : ''} ${!done && !isToday ? 'streak-week__dot--empty' : ''}`}>
                  {done && <Check size={14} color="#fff" />}
                </div>
                <span>{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* QuickFocus */}
      <Card className="quick-focus surface-card">
        <div className="quick-focus__icon">🍅</div>
        <div className="quick-focus__info">
          <div className="quick-focus__title">快速专注</div>
          <div className="quick-focus__sub">选一个任务，开始番茄钟专注</div>
        </div>
        <Link to={firstPending ? `/focus/${firstPending.id}` : '/tasks'}>
          <Button danger type="primary" size="middle" icon={<Play size={15} />}>开始</Button>
        </Link>
      </Card>

      {/* ───── 主体两栏 ───── */}
      <div className="home__cols">
        <div className="home__left">
          {/* ProgCard 暑假作业进度 */}
          <Card className="prog-card surface-card">
            <div className="prog-card__head">
              <ClipboardList size={16} color="var(--c-green)" />
              <span className="prog-card__title">暑假作业进度</span>
              <div className="surface-card__spacer" />
              <span className="prog-card__sub">总体完成 {overallPct}%</span>
            </div>
            <Divider type="dashed-brown" />
            {progressRows.length === 0 ? (
              <div style={{ padding: '12px 0', textAlign: 'center', color: 'var(--c-muted)', fontSize: 16 }}>
                还没有任务数据 · 完成第一个任务就会有进度啦
              </div>
            ) : (
              progressRows.map((p) => (
                <div key={p.name} className="prog-row">
                  <span className="prog-row__name">{p.name}</span>
                  <div className="prog-row__bar">
                    <div className="prog-row__fill" style={{ width: `${p.pct}%`, background: p.color }} />
                  </div>
                  <span className="prog-row__pct" style={{ color: p.color }}>{p.pct}%</span>
                </div>
              ))
            )}
          </Card>

          {/* SkillEntry 技能成长树 */}
          <Card className="skill-entry surface-card">
            <div className="skill-entry__head">
              <GitFork size={17} color="var(--c-green)" />
              <span className="skill-entry__title">技能成长树</span>
              <div className="surface-card__spacer" />
              <Tag size="small" color="app-green">总完成 {totalApproved} · 段位 {getRankByPoints(user.points).label}</Tag>
            </div>
            <div className="skill-entry__lines">
              {progressRows.slice(0, 4).map((line) => {
                const dots = Math.min(4, Math.round(line.pct / 25));
                return (
                  <div key={line.name} className="skill-line">
                    <span className="skill-line__name">{line.name}</span>
                    <div className="skill-line__dots">
                      {Array.from({ length: 4 }, (_, i) => (
                        <span
                          key={i}
                          className={`skill-dot ${i < dots ? 'skill-dot--filled' : ''}`}
                          style={i < dots ? { background: line.color } : undefined}
                        />
                      ))}
                    </div>
                    <span className="skill-line__count">{line.pct}%</span>
                  </div>
                );
              })}
              {progressRows.length === 0 && (
                <div style={{ fontSize: 16, color: 'var(--c-muted)', padding: '8px 0' }}>
                  开始完成任务 · 技能就会生长 🌱
                </div>
              )}
            </div>
            <Divider type="dashed-brown" />
            <div className="skill-entry__bottom">
              <Tag size="small" color="app-yellow">⭐ 可用技能点 {skillPoints}</Tag>
              <div className="surface-card__spacer" />
              <Link to="/skills">
                <Button type="primary" size="small" icon={<ArrowRight size={14} />}>查看技能树</Button>
              </Link>
            </div>
          </Card>
        </div>

        <div className="home__right">
          {/* 今日任务 */}
          <div className="task-section">
            <div className="task-section__head">
              <CircleCheckBig size={18} color="var(--c-green)" />
              <Title size="small" color="app-green">今日任务</Title>
              <div className="surface-card__spacer" />
              <Tag size="small" color="app-green">已完成 {completed.length}/{tasks.length}</Tag>
            </div>
            <div className="task-list">
              {tasks.slice(0, 5).map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </div>
          </div>

          {/* 今日生活习惯 — 孩子勾选，家长确认后计入 */}
          <Card className="habits-card surface-card">
            <div className="habits-card__head">
              <span className="habits-card__emoji">🏠</span>
              <div className="habits-card__title-wrap">
                <div className="habits-card__title">今日生活习惯</div>
                <div className="habits-card__sub">好习惯也能赚积分，由家长确认</div>
              </div>
              <Tag size="small" color="purple">{doneCount} / {habits.length} 完成</Tag>
            </div>
            {habits.length === 0 ? (
              <div style={{ fontSize: 16, color: 'var(--c-muted)', textAlign: 'center', padding: '12px 0' }}>
                还没有习惯 · 让家长在管理端添加
              </div>
            ) : (
              <>
                <Checkbox
                  direction="vertical"
                  value={habitsDone}
                  onChange={onHabitToggle}
                  disabled={habitSubmitted}
                  options={habits.map((h) => ({
                    label: (
                      <span className="habit-checkbox-label">
                        <span>{h.emoji}</span>
                        <span className="habit-chip__label">{h.label}</span>
                        <span className="habit-chip__pts">+{h.points}</span>
                      </span>
                    ),
                    value: h.id,
                  }))}
                />
                {habitSubmitted ? (
                  <Tag color="app-yellow" size="medium">
                    {habitTaskStatus === 'approved' ? '✅ 家长已入账' : '⏳ 等待家长审核'}
                  </Tag>
                ) : (
                  <Button
                    type="primary"
                    size="middle"
                    block
                    disabled={doneCount === 0}
                    onClick={submitHabits}
                  >
                    提交今日习惯给家长审核（+{habits.filter(h => habitsDone.includes(h.id)).reduce((a, h) => a + h.points, 0)} pts）
                  </Button>
                )}
              </>
            )}
          </Card>
        </div>
      </div>
      </div>

      <ToastModal open={homeToast !== null} message={homeToast ?? ''} onClose={() => setHomeToast(null)} />
    </>
  );
}

interface TaskRowProps { task: TaskInstance }

function TaskRow({ task }: TaskRowProps) {
  const done = task.status === 'approved' || task.status === 'awaiting_review';
  const subjectName = SUBJECT_NAME_BY_ID[task.subject] ?? task.subject;
  const subjectColor = done ? 'app-green' : 'default';

  return (
    <Card color={done ? 'app-green' : 'default'} className={`task-card ${done ? 'task-card--done' : ''}`}>
      <div className={`task-card__check ${done ? 'task-card__check--done' : ''}`}>
        {done && <Check size={13} color="#fff" />}
      </div>
      <div className="task-card__info">
        <div className={`task-card__title ${done ? 'task-card__title--done' : ''}`}>{task.title}</div>
        <div className="task-card__diff">
          {'★'.repeat(task.difficulty)}
          <span style={{ opacity: 0.3 }}>{'★'.repeat(5 - task.difficulty)}</span>
        </div>
        {task.praise && (
          <div className="task-card__praise">🌟 {task.praise}</div>
        )}
      </div>
      <div className="task-card__right">
        <Tag size="small" color={subjectColor}>{subjectName}</Tag>
        <Tag size="small" color={done ? 'app-green' : 'default'}>+{task.basePoints} pts</Tag>
      </div>
      {!done && (
        <Link to={`/focus/${task.id}`}>
          <Button size="small" icon={<Timer size={14} color="var(--c-orange)" />} style={{ background: '#FFF0E8', borderColor: 'var(--c-orange)', color: 'var(--c-orange)' }}>
            计时
          </Button>
        </Link>
      )}
    </Card>
  );
}

const SUBJECT_NAME_BY_ID: Record<string, string> = {
  chinese: '语文',
  math: '数学',
  english: '英语',
  physics: '物理',
  chemistry: '化学',
  politics: '政治',
  history: '历史',
  geography: '地理',
  biology: '生物',
  reading: '阅读',
  sports: '运动',
  habit: '习惯',
};
