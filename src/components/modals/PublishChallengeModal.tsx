import { useState } from 'react';
import { Button, Input, Modal } from 'animal-island-ui';
import type { Challenge } from '@/models';
import './PublishTaskModal.css';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (ch: Challenge) => void;
}

export default function PublishChallengeModal({ open, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('🏆');
  const [subtitle, setSubtitle] = useState('');
  const [reward, setReward] = useState('');
  const [targetTaskCount, setTargetTaskCount] = useState(5);
  const [days, setDays] = useState(7);
  const [err, setErr] = useState('');

  function reset() {
    setTitle(''); setEmoji('🏆'); setSubtitle(''); setReward('');
    setTargetTaskCount(5); setDays(7); setErr('');
  }

  function handleSubmit() {
    if (!title.trim() || !reward.trim()) { setErr('请填标题与关联奖励'); return; }
    if (targetTaskCount < 1 || days < 1) { setErr('目标数与天数需 ≥ 1'); return; }
    const now = Date.now();
    const ch: Challenge = {
      id: `custom-ch-${now}`,
      title: title.trim(),
      emoji: emoji.slice(0, 4),
      subtitle: subtitle.trim() || `完成 ${targetTaskCount} 个高质量任务解锁「${reward}」`,
      reward: reward.trim(),
      targetTaskCount,
      startAt: now,
      endAt: now + days * 86_400_000,
    };
    onSubmit(ch);
    reset();
    onClose();
  }

  return (
    <Modal
      open={open}
      title="发布限时挑战"
      typewriter={false}
      onClose={onClose}
      width={520}
      footer={
        <div className="modal-footer">
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={handleSubmit}>发布</Button>
        </div>
      }
    >
      <div className="publish-task-form">
        <div className="publish-task-row publish-task-row--grid">
          <div>
            <label className="publish-task-label">标题</label>
            <Input value={title} onChange={(e) => { setTitle(e.target.value); setErr(''); }} placeholder="如：周末阅读挑战" />
          </div>
          <div>
            <label className="publish-task-label">Emoji</label>
            <Input value={emoji} onChange={(e) => setEmoji(e.target.value.slice(0, 4))} />
          </div>
        </div>

        <div className="publish-task-row">
          <label className="publish-task-label">副标题（可选）</label>
          <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="留空则自动生成" />
        </div>

        <div className="publish-task-row publish-task-row--grid">
          <div>
            <label className="publish-task-label">关联奖励（非积分）</label>
            <Input value={reward} onChange={(e) => setReward(e.target.value)} placeholder="观赛权 / 出游 / 游戏时长..." />
          </div>
          <div>
            <label className="publish-task-label">目标任务数</label>
            <Input type="number" value={String(targetTaskCount)} onChange={(e) => setTargetTaskCount(Math.max(1, Number(e.target.value) || 1))} suffix="项" />
          </div>
        </div>

        <div className="publish-task-row publish-task-row--grid">
          <div>
            <label className="publish-task-label">时长</label>
            <Input type="number" value={String(days)} onChange={(e) => setDays(Math.max(1, Number(e.target.value) || 1))} suffix="天" />
          </div>
          <div>
            <div className="publish-task-hint">到期仅关闭机会，不扣分、不负债</div>
          </div>
        </div>

        {err && <div className="publish-task-err">{err}</div>}
      </div>
    </Modal>
  );
}
