import { Button, Modal, Tag } from 'animal-island-ui';
import { ArrowLeft, ArrowRight, CalendarX, CircleCheckBig, TriangleAlert } from 'lucide-react';
import './TaskFeedbackModals.css';

/* ───────── CompleteModal（bo4hR） ───────── */

export interface CompleteData {
  title: string;
  difficulty: number;
  standardMinutes: number;
  actualMinutes: number;
  savedMinutes: number;
  bankMinutes: number;
  previewPoints: number;
  finishedInPomodoro: boolean;
}

interface CompleteProps {
  open: boolean;
  data: CompleteData | null;
  onClose: () => void;
  onNext: () => void;
}

export function CompleteModal({ open, data, onClose, onNext }: CompleteProps) {
  if (!data) return null;
  return (
    <Modal
      open={open}
      title="任务完成！"
      typewriter={false}
      onClose={onClose}
      width={440}
      footer={
        <div className="modal-footer">
          <Button onClick={onClose}>留在此页</Button>
          <Button type="primary" icon={<ArrowRight size={15} />} onClick={onNext}>继续下一个任务</Button>
        </div>
      }
    >
      <div className="fb-modal fb-modal--complete">
        <div className="fb-icon fb-icon--green">
          <CircleCheckBig size={38} color="var(--c-green)" />
        </div>
        <div className="fb-title">{data.title}</div>
        <div className="fb-sub">{'★'.repeat(data.difficulty)}</div>

        <div className="fb-stats">
          <div className="fb-stat">
            <div className="fb-stat__value">{data.standardMinutes} 分</div>
            <div className="fb-stat__label">标准时长</div>
          </div>
          <div className="fb-stat">
            <div className="fb-stat__value fb-stat__value--green">{data.actualMinutes} 分</div>
            <div className="fb-stat__label">实际用时</div>
          </div>
          <div className="fb-stat">
            <div className="fb-stat__value fb-stat__value--orange">{data.savedMinutes.toFixed(0)} 分</div>
            <div className="fb-stat__label">提前</div>
          </div>
        </div>

        <div className="fb-bank">
          <span className="fb-bank__emoji">🏦</span>
          <div className="fb-bank__info">
            <div className="fb-bank__line1">已存入今日时间银行 +{data.bankMinutes.toFixed(0)} 分钟</div>
            {data.finishedInPomodoro && (
              <div className="fb-bank__line2">🍅 番茄内完成 ×1.2 已计入</div>
            )}
          </div>
        </div>

        <div className="fb-preview">
          <span>预计可兑换</span>
          <Tag size="medium" color="app-green" variant="solid">+{data.previewPoints} 积分</Tag>
        </div>
        <div className="fb-note">今日累计将于家长验收后统一释放</div>
      </div>
    </Modal>
  );
}

/* ───────── WarnModal（W88eYy） ───────── */

interface WarnProps {
  open: boolean;
  leaves: number; // 1 or 2
  maxLeaves: number; // 3
  onReturn: () => void;
}

export function WarnModal({ open, leaves, maxLeaves, onReturn }: WarnProps) {
  return (
    <Modal
      open={open}
      title="检测到你离开了学习界面！"
      typewriter={false}
      onClose={onReturn}
      width={440}
      footer={
        <div className="modal-footer">
          <Button type="primary" icon={<ArrowLeft size={15} />} onClick={onReturn}>立即返回专注</Button>
        </div>
      }
    >
      <div className="fb-modal">
        <div className="fb-icon fb-icon--red">
          <TriangleAlert size={36} color="var(--c-red)" />
        </div>
        <div className="fb-desc">
          番茄钟专注期间切换到其他应用会中断专注，请立刻返回继续学习。
        </div>

        <div className="fb-dots">
          {Array.from({ length: maxLeaves }, (_, i) => (
            <div key={i} className="fb-dot">
              <div className={`fb-dot__circle ${i < leaves ? 'fb-dot__circle--bad' : ''}`} />
              <span className={i < leaves ? 'fb-dot__label--bad' : ''}>第{i + 1}次</span>
            </div>
          ))}
        </div>

        <div className="fb-warn">
          <span>⚠️</span>
          <span>这是第 {leaves} 次警告！再离开 {maxLeaves - leaves} 次，今日打卡将判定失败，已专注时间作废。</span>
        </div>
      </div>
    </Modal>
  );
}

/* ───────── FailModal（XRnBj） ───────── */

interface FailProps {
  open: boolean;
  onAck: () => void;
}

export function FailModal({ open, onAck }: FailProps) {
  return (
    <Modal
      open={open}
      title="今日打卡失败"
      typewriter={false}
      onClose={onAck}
      width={440}
      footer={
        <div className="modal-footer">
          <Button block onClick={onAck}>我知道了</Button>
        </div>
      }
    >
      <div className="fb-modal">
        <div className="fb-icon fb-icon--red">
          <CalendarX size={36} color="var(--c-red)" />
        </div>
        <div className="fb-desc">
          专注期间离开学习界面已达 3 次，本次专注作废，今日打卡判定失败。
        </div>

        <div className="fb-dots">
          {[1, 2, 3].map((n) => (
            <div key={n} className="fb-dot">
              <div className="fb-dot__circle fb-dot__circle--bad" />
              <span className="fb-dot__label--bad">第{n}次</span>
            </div>
          ))}
        </div>

        <div className="fb-tip">
          <span>💡</span>
          <div>
            <div className="fb-tip__title">明天重新开始！</div>
            <div className="fb-tip__desc">专注前把 iPad 其他应用关掉，更容易坚持。连续打卡可从明天重新累积。</div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
