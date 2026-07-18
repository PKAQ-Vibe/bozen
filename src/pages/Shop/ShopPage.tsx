import { useMemo, useState } from 'react';
import { Button, Card, Divider, Modal, Tag, Title, Wallet } from 'animal-island-ui';
import { Award, HandCoins, ShoppingBag } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import AdvanceRequestModal from '@/components/modals/AdvanceRequestModal';
import { RANKS, getActiveAdvance, getAllShopItems, getNextRank, getRankByPoints, hasPending, outstandingDebt } from '@/services';
import { useUser } from '@/hooks/useUser';
import type { ShopCategory, ShopItem } from '@/models';
import './ShopPage.css';

const CAT: Record<ShopCategory, { label: string; emoji: string; subtitle: string }> = {
  game: { label: '游戏时间', emoji: '🎮', subtitle: '每周上限 5 小时' },
  privilege: { label: '特权卡（自主感）', emoji: '🎟', subtitle: '非物质奖励，无限供应' },
  football: { label: '足球周边', emoji: '⚽', subtitle: '球鞋券每年限 2 双' },
};

const STATUS_LABEL = {
  pending_review: { label: '待发放', tone: 'wait' as const },
  approved: { label: '已发放', tone: 'ok' as const },
  rejected: { label: '已退回', tone: 'bad' as const },
};

export default function ShopPage() {
  const { user, redeem, setRedemptionStatus } = useUser();
  const [confirming, setConfirming] = useState<ShopItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [advancePreset, setAdvancePreset] = useState<{ amount?: number; purpose?: string }>({});
  const debt = outstandingDebt();
  const activeAdv = getActiveAdvance();
  const advPending = hasPending();
  const rank = getRankByPoints(user.points);
  const nextRank = getNextRank(user.points);
  const targetPoints = nextRank?.minPoints ?? user.points;

  const grouped = useMemo(() => {
    return getAllShopItems().reduce(
      (acc, it) => {
        (acc[it.category] ||= []).push(it);
        return acc;
      },
      {} as Record<ShopCategory, ShopItem[]>,
    );
  }, [user.redemptions.length]);

  const rankProgress = nextRank
    ? Math.min(100, ((user.points - rank.minPoints) / (targetPoints - rank.minPoints)) * 100)
    : 100;

  function tryRedeem(item: ShopItem) {
    if (user.points < item.price) {
      setAdvancePreset({ amount: item.price - user.points, purpose: item.name });
      setAdvanceOpen(true);
      return;
    }
    setConfirming(item);
  }

  function confirmRedeem() {
    if (!confirming) return;
    const r = redeem({ id: confirming.id, name: confirming.name, price: confirming.price });
    setConfirming(null);
    setToast(r.ok ? `🎉 已提交「${confirming.name}」兑换，等家长发放` : r.reason ?? '兑换失败');
  }

  return (
    <>
      <PageHeader
        title="积分商城"
        sub="努力学习换取奖励，需家长审核兑现"
        extra={<Wallet value={user.points} size="small" icon={<span style={{ fontSize: 20 }}>⭐</span>} />}
      />

      <div className="page-body shop-page">
        {/* 主列：段位 + 商城 */}
        <section className="shop-col shop-col--main">
          {/* Rank Card — 用 island Card + brown 色贴近原型深绿感觉 */}
          <Card color="brown" pattern="brown" className="rank-card">
            <div className="rank-card__row">
              <span className="rank-card__emoji">{rank.emoji}</span>
              <div className="rank-card__info">
                <div className="rank-card__title">{rank.label}</div>
                <div className="rank-card__sub">
                  {nextRank ? `距离「${nextRank.label}」还差 ${targetPoints - user.points} pts` : '已达最高段位 👑'}
                </div>
              </div>
              <div className="rank-card__num">{user.points.toLocaleString()} / {targetPoints}</div>
            </div>
            <div className="rank-card__bar">
              <div style={{ width: `${rankProgress}%` }} />
            </div>
            <div className="rank-card__stages">
              {RANKS.map((r) => {
                const reached = user.points >= r.minPoints;
                return (
                  <span key={r.key} className={reached ? 'rank-stage rank-stage--reached' : 'rank-stage'}>
                    {r.label.replace('联赛', '').replace('奖', '')}
                  </span>
                );
              })}
            </div>
          </Card>

          {/* 预支状态提示 */}
          {(debt > 0 || activeAdv || advPending) && (
            <Card color="warm-peach-pink" className="shop-advance">
              <HandCoins size={18} color="#fff" />
              <div style={{ flex: 1 }}>
                {advPending && <div>预支申请等家长审核中 · 尚未发放</div>}
                {activeAdv && (
                  <div>
                    预支已发放 {activeAdv.amount} pts · 剩余待还 <strong>{debt}</strong> pts ·
                    承诺任务 {activeAdv.promisedTaskCount} 项 · 还款期至 {new Date(activeAdv.dueAt).toLocaleDateString('zh-CN')}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* 奖励商城 标题 */}
          <div className="shop-section-head">
            <ShoppingBag size={18} color="var(--c-orange)" />
            <Title size="middle" color="app-orange">奖励商城</Title>
          </div>

          {/* 3 分组 */}
          {(['game', 'privilege', 'football'] as ShopCategory[]).map((cat) => (
            <div key={cat} className="shop-group">
              <div className="shop-group__head">
                <span className="shop-group__emoji">{CAT[cat].emoji}</span>
                <span className="shop-group__title">{CAT[cat].label}</span>
                <div className="shop-section-spacer" />
                <span className="shop-group__sub">{CAT[cat].subtitle}</span>
              </div>
              <Divider type="dashed-brown" />
              <div className="shop-grid">
                {(grouped[cat] ?? []).map((item) => {
                  const affordable = user.points >= item.price;
                  return (
                    <Card key={item.id} className="shop-item">
                      <div className="shop-item__emoji">{item.emoji}</div>
                      <div className="shop-item__info">
                        <div className="shop-item__name">{item.name}</div>
                        <div className="shop-item__desc">{item.description}</div>
                        <div className="shop-item__tags">
                          {item.weeklyLimit && <Tag size="small">每周 {item.weeklyLimit}</Tag>}
                          {item.yearlyLimit && <Tag size="small">每年 {item.yearlyLimit}</Tag>}
                        </div>
                      </div>
                      <div className="shop-item__right">
                        <div className="shop-item__price">
                          <span className="shop-item__price-num">{item.price}</span>
                          <span className="shop-item__price-unit">pts</span>
                        </div>
                        <Button
                          type={affordable ? 'primary' : 'default'}
                          size="small"
                          disabled={!affordable}
                          onClick={() => tryRedeem(item)}
                        >
                          {affordable ? '兑换' : '差 ' + (item.price - user.points)}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        {/* 侧列：兑换记录 */}
        <aside className="shop-col shop-col--side">
          <div className="shop-section-head">
            <Award size={18} color="var(--c-green)" />
            <span className="shop-section-title">兑换记录</span>
            <div className="shop-section-spacer" />
            <Tag size="small">{user.redemptions.length}</Tag>
          </div>

          <div className="rec-list">
            {user.redemptions.length === 0 ? (
              <Card type="dashed" className="rec-empty">还没有兑换记录。先去完成几个任务吧～</Card>
            ) : (
              user.redemptions.map((r) => (
                <Card key={r.id} className="rec-row">
                  <div className="rec-row__main">
                    <div className="rec-row__name">{r.itemName}</div>
                    <div className="rec-row__meta">
                      -{r.price} pts · {new Date(r.createdAt).toLocaleString('zh-CN')}
                    </div>
                  </div>
                  <Tag
                    size="small"
                    color={r.status === 'approved' ? 'app-green' : r.status === 'rejected' ? 'app-red' : 'app-yellow'}
                    variant="solid"
                  >
                    {STATUS_LABEL[r.status].label}
                  </Tag>
                  {r.status === 'pending_review' && (
                    <div className="rec-row__actions">
                      <Button size="small" type="primary" onClick={() => setRedemptionStatus(r.id, 'approved')}>发放</Button>
                      <Button size="small" danger onClick={() => setRedemptionStatus(r.id, 'rejected', '本周额度已满')}>退回</Button>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        </aside>
      </div>

      {confirming && (
        <Modal
          open
          title="确认兑换"
          typewriter={false}
          onClose={() => setConfirming(null)}
          footer={
            <div className="modal-footer">
              <Button onClick={() => setConfirming(null)}>取消</Button>
              <Button type="primary" onClick={confirmRedeem}>兑换 {confirming.price} pts</Button>
            </div>
          }
        >
          <div className="modal-body">
            兑换「{confirming.name}」需要 <strong>{confirming.price}</strong> 积分。
            兑换后会扣除积分并提交给家长审核发放。
          </div>
        </Modal>
      )}

      {toast && (
        <Modal
          open
          title="提示"
          typewriter={false}
          onClose={() => setToast(null)}
          footer={
            <div className="modal-footer">
              <Button type="primary" onClick={() => setToast(null)}>知道了</Button>
            </div>
          }
        >
          <div className="modal-body">{toast}</div>
        </Modal>
      )}

      <AdvanceRequestModal
        open={advanceOpen}
        onClose={() => setAdvanceOpen(false)}
        onSuccess={(msg) => setToast(msg)}
        suggestedAmount={advancePreset.amount}
        suggestedPurpose={advancePreset.purpose}
      />
    </>
  );
}
