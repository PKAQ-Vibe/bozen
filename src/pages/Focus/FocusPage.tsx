import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from 'animal-island-ui';
import { Check, Pause, Play, ScanEye, X } from 'lucide-react';
import { CompleteModal, FailModal, WarnModal } from '@/components/modals/TaskFeedbackModals';
import type { CompleteData } from '@/components/modals/TaskFeedbackModals';
import SubmissionModal from '@/components/modals/SubmissionModal';
import { useDayTasks } from '@/hooks/useDayTasks';
import { seedConfig, settleTask } from '@/services';
import { todayKey } from '@/utils/date';
import './FocusPage.css';

const MAX_LEAVES = 3;

type Phase = 'idle' | 'running' | 'paused' | 'finished';

const RING_SIZE = 300;
const RING_STROKE = 8;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRC = 2 * Math.PI * RING_RADIUS;

export default function FocusPage() {
  const { taskId = '' } = useParams();
  const date = todayKey();
  const { tasks, save } = useDayTasks(date);
  const navigate = useNavigate();

  const task = useMemo(() => tasks.find((t) => t.id === taskId), [tasks, taskId]);
  const pomodoroLen = seedConfig.pomodoroMinutes * 60;

  const [phase, setPhase] = useState<Phase>('idle');
  const [secondsLeft, setSecondsLeft] = useState(pomodoroLen);
  const [pomodorosSession, setPomodorosSession] = useState(0);
  const [bonusSession, setBonusSession] = useState(0);
  const [accumSeconds, setAccumSeconds] = useState(task?.actualSeconds ?? 0);
  const [completeData, setCompleteData] = useState<CompleteData | null>(null);
  const [warnOpen, setWarnOpen] = useState(false);
  const [failOpen, setFailOpen] = useState(false);
  const [submissionOpen, setSubmissionOpen] = useState(false);
  const [leaves, setLeaves] = useState(0);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    setAccumSeconds(task?.actualSeconds ?? 0);
  }, [task?.id, task?.actualSeconds]);

  const stopTicker = useCallback(() => {
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  useEffect(() => stopTicker, [stopTicker]);

  // 监测：页面失焦 → 离开次数 +1（§三 iPad 监测）
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && phase === 'running') {
        setLeaves((n) => {
          const next = n + 1;
          if (next >= MAX_LEAVES) {
            setFailOpen(true);
            // 判定失败：作废本次专注
            setAccumSeconds(task?.actualSeconds ?? 0);
            setPomodorosSession(0);
            setBonusSession(0);
            stopTicker();
            setPhase('idle');
          } else {
            setWarnOpen(true);
          }
          return next;
        });
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const persistProgress = useCallback((seconds: number, pomodoros: number) => {
    if (!task) return;
    save({ ...task, actualSeconds: seconds, pomodoros, status: 'in_progress' });
  }, [task, save]);

  function runTick() {
    stopTicker();
    tickRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(tickRef.current!);
          tickRef.current = null;
          const newAccum = accumSeconds + 1;
          const completed = pomodorosSession + 1;
          let nextBonus = bonusSession + seedConfig.pomodoroBonusPerCycle;
          if (completed % 3 === 0) nextBonus += seedConfig.pomodoroStreakBonus;
          setAccumSeconds(newAccum);
          setPomodorosSession(completed);
          setBonusSession(nextBonus);
          persistProgress(newAccum, (task?.pomodoros ?? 0) + completed);
          setPhase('idle');
          return pomodoroLen;
        }
        return s - 1;
      });
      setAccumSeconds((a) => a + 1);
    }, 1000);
  }

  function start() { setPhase('running'); runTick(); }
  function pause() { stopTicker(); setPhase('paused'); persistProgress(accumSeconds, (task?.pomodoros ?? 0) + pomodorosSession); }
  function resume() { setPhase('running'); runTick(); }
  function abandon() {
    stopTicker();
    if (task) persistProgress(accumSeconds, (task.pomodoros ?? 0) + pomodorosSession);
    navigate('/tasks');
  }
  function finish() {
    stopTicker();
    if (!task) return;
    // 先弹作业提交
    setSubmissionOpen(true);
  }

  function completeWithSubmission(submissionText: string, submissionImages: string[]) {
    if (!task) return;
    const finishedInPomodoro = pomodorosSession > 0 && phase === 'running';
    const nextTask = {
      ...task,
      actualSeconds: accumSeconds,
      pomodoros: (task.pomodoros ?? 0) + pomodorosSession,
      finishedInPomodoro,
      status: 'awaiting_review' as const,
      completedAt: Date.now(),
      submissionText: submissionText || undefined,
      submissionImages: submissionImages.length > 0 ? submissionImages : undefined,
    };
    save(nextTask);
    setSubmissionOpen(false);
    setPhase('finished');

    const r = settleTask(nextTask, seedConfig);
    const savedMin = Math.max(0, task.standardMinutes - accumSeconds / 60);
    setCompleteData({
      title: task.title,
      difficulty: task.difficulty,
      standardMinutes: task.standardMinutes,
      actualMinutes: Math.round(accumSeconds / 60),
      savedMinutes: savedMin,
      bankMinutes: r.savedMinutes,
      previewPoints: r.awardedPoints + bonusSession,
      finishedInPomodoro,
    });
  }

  if (!task) {
    return (
      <div className="focus-page">
        <div className="focus-page__missing">
          没找到该任务。<Link to="/tasks" style={{ color: 'var(--c-green)' }}>返回任务列表</Link>
        </div>
      </div>
    );
  }

  // 进度（基于当前番茄钟）
  const ringProgress = ((pomodoroLen - secondsLeft) / pomodoroLen) * RING_CIRC;
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div className="focus-page">
      {/* TopBar */}
      <div className="focus-topbar">
        <div className="focus-topbar__task">
          <span>📝</span>
          <span>{task.title} · {'★'.repeat(task.difficulty)}</span>
        </div>
        <div className="focus-topbar__spacer" />
        <button className="focus-exit" onClick={abandon} type="button">
          <X size={15} color="#7AAF92" />
          <span>放弃专注</span>
        </button>
      </div>

      {/* Center */}
      <div className="focus-center">
        <div className="focus-ring-wrap" style={{ width: RING_SIZE, height: RING_SIZE }}>
          <svg width={RING_SIZE} height={RING_SIZE} className="focus-ring-svg">
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              stroke="#3D6B4F"
              strokeWidth={RING_STROKE}
            />
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              stroke="#5BAD52"
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={RING_CIRC}
              strokeDashoffset={RING_CIRC - ringProgress}
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
              style={{ transition: 'stroke-dashoffset 0.4s linear' }}
            />
          </svg>
          <div className="focus-ring-inner">
            <div className="focus-ring__status">{phase === 'running' ? '专注中' : phase === 'paused' ? '已暂停' : '准备开始'}</div>
            <div className="focus-ring__big">{mm}:{ss}</div>
            <div className="focus-ring__pomo">
              <span>🍅</span>
              <span>第 {pomodorosSession + (phase === 'running' || phase === 'paused' ? 1 : 1)} 个番茄钟</span>
            </div>
          </div>
        </div>

        {/* Bonus pills */}
        <div className="focus-bonus">
          <span className="focus-bonus__pill">⚡ 不中断 +{seedConfig.pomodoroBonusPerCycle} 加成</span>
          <span className="focus-bonus__pill">✨ 番茄内完成任务 ×{seedConfig.pomodoroFinishMultiplier}</span>
          {bonusSession > 0 && (
            <span className="focus-bonus__pill focus-bonus__pill--earned">本次已累计 +{bonusSession}</span>
          )}
        </div>

        {/* Controls */}
        <div className="focus-ctrl">
          {phase === 'idle' && (
            <Button type="primary" size="large" icon={<Play size={16} />} onClick={start} style={{ background: '#E8834A', borderColor: '#E8834A' }}>开始</Button>
          )}
          {phase === 'running' && (
            <Button size="large" icon={<Pause size={16} />} onClick={pause} style={{ background: '#E8834A', borderColor: '#E8834A', color: '#fff' }}>暂停</Button>
          )}
          {phase === 'paused' && (
            <Button type="primary" size="large" icon={<Play size={16} />} onClick={resume}>继续</Button>
          )}
          <Button type="primary" size="large" icon={<Check size={16} />} onClick={finish} disabled={accumSeconds === 0}>
            完成任务
          </Button>
        </div>
      </div>

      {/* MonitorBar */}
      <div className="focus-monitor">
        <ScanEye size={18} color="#7AAF92" />
        <div className="focus-monitor__info">
          <div className="focus-monitor__line1">使用行为监测中 · 请勿切换到其他应用</div>
          <div className="focus-monitor__line2">专注期间离开学习界面会被记录，累计 3 次今日打卡判定失败</div>
        </div>
        <div className="focus-monitor__spacer" />
        <span className="focus-monitor__label">离开次数</span>
        <div className="focus-monitor__dots">
          {[0, 1, 2].map((i) => (
            <span key={i} className={`focus-monitor__dot ${i < leaves ? 'focus-monitor__dot--bad' : ''}`} />
          ))}
          <span className={`focus-monitor__count ${leaves > 0 ? 'focus-monitor__count--bad' : ''}`}>{leaves} / 3</span>
        </div>
      </div>

      <CompleteModal
        open={completeData !== null}
        data={completeData}
        onClose={() => setCompleteData(null)}
        onNext={() => {
          setCompleteData(null);
          navigate('/tasks');
        }}
      />

      <WarnModal
        open={warnOpen}
        leaves={leaves}
        maxLeaves={MAX_LEAVES}
        onReturn={() => setWarnOpen(false)}
      />

      <FailModal
        open={failOpen}
        onAck={() => {
          setFailOpen(false);
          navigate('/tasks');
        }}
      />

      <SubmissionModal
        open={submissionOpen}
        taskTitle={task.title}
        onClose={() => setSubmissionOpen(false)}
        onSubmit={({ text, images }) => completeWithSubmission(text, images)}
      />
    </div>
  );
}
