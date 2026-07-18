// 家长端：预支申请审核（§7.4 · 方案 C）

import { useMemo, useState } from 'react';
import { Button, Card, Tag } from 'animal-island-ui';
import { HandCoins } from 'lucide-react';
import { approveAdvance, getAdvances, rejectAdvance } from '@/services';
import { useUser } from '@/hooks/useUser';
import { grantAdvance } from '@/services/userService';
import type { Advance } from '@/models';

export default function AdvanceReviewPanel() {
  const [tick, setTick] = useState(0);
  const advances = useMemo(() => getAdvances(), [tick]);
  const { user } = useUser();
  void user;

  const pending = advances.filter((a) => a.status === 'pending');
  const active = advances.filter((a) => a.status === 'approved');
  const closed = advances.filter((a) => a.status === 'settled' || a.status === 'rejected');

  function approve(a: Advance) {
    approveAdvance(a.id, '已批准，请按期还款');
    // 立刻发放：孩子钱包 += amount
    grantAdvance(a.amount);
    setTick((n) => n + 1);
  }
  function reject(a: Advance) {
    rejectAdvance(a.id, '暂不批准 · 请先完成当前必修');
    setTick((n) => n + 1);
  }

  return (
    <div className="advance-review">
      <Card className="advance-hero">
        <HandCoins size={18} color="var(--c-orange)" />
        <div style={{ flex: 1 }}>
          <div className="advance-hero__title">提前兑现审核</div>
          <div className="advance-hero__sub">
            审批后立刻发放 · 后续赚积分的 50% 自动还债 · 绝不利滚利
          </div>
        </div>
        <Tag color="app-orange" size="small">待审核 {pending.length}</Tag>
      </Card>

      {pending.length === 0 && (
        <Card type="dashed" className="advance-empty">当前没有待审核的预支申请</Card>
      )}

      {pending.map((a) => (
        <Card key={a.id} className="advance-item">
          <div className="advance-item__head">
            <span className="advance-item__amount">申请 {a.amount} pts</span>
            <Tag size="small" color="app-yellow">承诺 {a.promisedTaskCount} 项任务</Tag>
            <div style={{ flex: 1 }} />
            <span className="advance-item__due">还款期至 {new Date(a.dueAt).toLocaleDateString('zh-CN')}</span>
          </div>
          <div className="advance-item__purpose">目的：{a.purpose}</div>
          <div className="advance-item__actions">
            <Button size="small" onClick={() => reject(a)}>拒绝</Button>
            <Button size="small" type="primary" onClick={() => approve(a)}>批准并发放</Button>
          </div>
        </Card>
      ))}

      {active.length > 0 && (
        <>
          <div className="advance-section-title">进行中</div>
          {active.map((a) => (
            <Card key={a.id} color="app-yellow" className="advance-item">
              <div className="advance-item__head">
                <span className="advance-item__amount">{a.amount} pts</span>
                <Tag size="small" color="app-yellow">已还 {a.repaid} / {a.amount}</Tag>
                <div style={{ flex: 1 }} />
                <span className="advance-item__due">目的：{a.purpose}</span>
              </div>
              <div className="advance-item__bar">
                <div style={{ width: `${(a.repaid / a.amount) * 100}%` }} />
              </div>
            </Card>
          ))}
        </>
      )}

      {closed.length > 0 && (
        <>
          <div className="advance-section-title">已结束</div>
          {closed.map((a) => (
            <Card key={a.id} className="advance-item">
              <span className="advance-item__amount" style={{ opacity: 0.6 }}>
                {a.amount} pts · {a.purpose}
              </span>
              <Tag size="small" color={a.status === 'settled' ? 'app-green' : 'app-red'}>
                {a.status === 'settled' ? '已还清' : '已拒绝'}
              </Tag>
            </Card>
          ))}
        </>
      )}

      <style>{`
        .advance-review { display: flex; flex-direction: column; gap: 10px; }
        .advance-hero { display: flex !important; flex-direction: row !important; align-items: center; gap: 10px; }
        .advance-hero__title { font-family: var(--font-heading); font-size: 16px; font-weight: 700; color: var(--c-dark); }
        .advance-hero__sub { font-size: 16px; color: var(--c-muted); }
        .advance-empty { padding: 24px; text-align: center; color: var(--c-muted); }
        .advance-item { display: flex; flex-direction: column; gap: 8px; }
        .advance-item__head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .advance-item__amount { font-family: var(--font-heading); font-size: 16px; font-weight: 700; color: var(--c-orange); }
        .advance-item__due { font-size: 16px; color: var(--c-muted); }
        .advance-item__purpose { font-size: 16px; color: var(--c-mid); }
        .advance-item__actions { display: flex; gap: 8px; justify-content: flex-end; }
        .advance-item__bar { height: 6px; background: #ede8e0; border-radius: 3px; overflow: hidden; }
        .advance-item__bar > div { height: 100%; background: var(--c-green); }
        .advance-section-title { font-family: var(--font-heading); font-size: 16px; font-weight: 700; color: var(--c-mid); margin-top: 6px; }
      `}</style>
    </div>
  );
}
