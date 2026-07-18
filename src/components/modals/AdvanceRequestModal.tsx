import { useState } from 'react';
import { Button, Input, Modal } from 'animal-island-ui';
import { applyForAdvance } from '@/services';
import { ADVANCE_HARD_CAP, ADVANCE_TASK_MULTIPLIER } from '@/models';
import './PublishTaskModal.css';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  suggestedAmount?: number;
  suggestedPurpose?: string;
}

export default function AdvanceRequestModal({ open, onClose, onSuccess, suggestedAmount, suggestedPurpose }: Props) {
  const [amount, setAmount] = useState(suggestedAmount ?? 100);
  const [purpose, setPurpose] = useState(suggestedPurpose ?? '');
  const [days, setDays] = useState(7);
  const [err, setErr] = useState('');

  const taskEst = Math.ceil((amount / 40) * ADVANCE_TASK_MULTIPLIER);

  function submit() {
    setErr('');
    const r = applyForAdvance({ amount, purpose, days });
    if (!r.ok) { setErr(r.reason || '申请失败'); return; }
    onSuccess(`✅ 已提交预支申请 ${amount} pts · 承诺 ${taskEst} 项任务 · 等家长批准`);
    onClose();
  }

  return (
    <Modal
      open={open}
      title="申请提前兑现"
      typewriter={false}
      onClose={onClose}
      width={500}
      footer={
        <div className="modal-footer">
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={submit}>提交给家长审核</Button>
        </div>
      }
    >
      <div className="publish-task-form">
        <div className="publish-task-row publish-task-row--grid">
          <div>
            <label className="publish-task-label">预支金额（≤ {ADVANCE_HARD_CAP} pts）</label>
            <Input
              type="number"
              value={String(amount)}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
              suffix="pts"
            />
          </div>
          <div>
            <label className="publish-task-label">还款期</label>
            <Input
              type="number"
              value={String(days)}
              onChange={(e) => setDays(Number(e.target.value) || 0)}
              suffix="天"
            />
          </div>
        </div>

        <div className="publish-task-row">
          <label className="publish-task-label">目的（想买什么？）</label>
          <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="想提前兑换球鞋券..." />
        </div>

        <div className="publish-task-row">
          <div className="publish-task-hint">
            📐 承诺额外完成 <strong>{taskEst}</strong> 项高质量任务作为担保（1.2 倍量）<br />
            🚫 兑现规则：偿还任务/努力 · 不利滚利 · 总额封顶<br />
            💡 家长批准后立刻发放积分；后续每次赚积分的 50% 自动还债
          </div>
        </div>

        {err && <div className="publish-task-err">{err}</div>}
      </div>
    </Modal>
  );
}
