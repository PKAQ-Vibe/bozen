import { useState } from 'react';
import { Button, Input, Modal, Radio, Select } from 'animal-island-ui';
import type { ShopCategory, ShopItem } from '@/models';
import './PublishTaskModal.css';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (item: ShopItem) => void;
}

const CATEGORY_OPTIONS: { key: ShopCategory; label: string; emoji: string }[] = [
  { key: 'game', label: '🎮 游戏时间', emoji: '🎮' },
  { key: 'privilege', label: '🎟 特权卡', emoji: '🎟' },
  { key: 'football', label: '⚽ 足球周边', emoji: '⚽' },
];

const LIMIT_OPTIONS = [
  { label: '不限', value: 'none' },
  { label: '每周限', value: 'weekly' },
  { label: '每年限', value: 'yearly' },
];

export default function PublishGiftModal({ open, onClose, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ShopCategory>('game');
  const [price, setPrice] = useState(200);
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('🎁');
  const [limitType, setLimitType] = useState<'none' | 'weekly' | 'yearly'>('none');
  const [limitCount, setLimitCount] = useState(1);
  const [err, setErr] = useState('');

  function reset() {
    setName(''); setCategory('game'); setPrice(200); setDescription(''); setEmoji('🎁');
    setLimitType('none'); setLimitCount(1); setErr('');
  }

  function handleSubmit() {
    if (!name.trim()) { setErr('请填礼品名称'); return; }
    if (price < 10 || price > 10000) { setErr('积分建议 10-10000'); return; }
    const item: ShopItem = {
      id: `custom-gift-${Date.now()}`,
      category,
      name: name.trim(),
      description: description.trim(),
      price,
      emoji,
      ...(limitType === 'weekly' ? { weeklyLimit: limitCount } : {}),
      ...(limitType === 'yearly' ? { yearlyLimit: limitCount } : {}),
    };
    onSubmit(item);
    reset();
    onClose();
  }

  return (
    <Modal
      open={open}
      title="发布新礼品"
      typewriter={false}
      onClose={onClose}
      width={520}
      footer={
        <div className="modal-footer">
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={handleSubmit}>上架</Button>
        </div>
      }
    >
      <div className="publish-task-form">
        <div className="publish-task-row publish-task-row--grid">
          <div>
            <label className="publish-task-label">礼品名称</label>
            <Input
              value={name}
              onChange={(e) => { setName(e.target.value); setErr(''); }}
              placeholder="如：周末多 1 小时游戏"
              allowClear
            />
          </div>
          <div>
            <label className="publish-task-label">Emoji</label>
            <Input value={emoji} onChange={(e) => setEmoji(e.target.value.slice(0, 4))} />
          </div>
        </div>

        <div className="publish-task-row publish-task-row--grid">
          <div>
            <label className="publish-task-label">分类</label>
            <Select
              options={CATEGORY_OPTIONS.map((c) => ({ key: c.key, label: c.label }))}
              value={category}
              onChange={(k) => setCategory(k as ShopCategory)}
            />
          </div>
          <div>
            <label className="publish-task-label">价格</label>
            <Input
              type="number"
              value={String(price)}
              onChange={(e) => setPrice(Number(e.target.value) || 0)}
              suffix="pts"
            />
          </div>
        </div>

        <div className="publish-task-row">
          <label className="publish-task-label">描述</label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="给孩子一句说明"
          />
        </div>

        <div className="publish-task-row">
          <label className="publish-task-label">限购规则</label>
          <Radio
            options={LIMIT_OPTIONS}
            value={limitType}
            onChange={(v) => setLimitType(v as 'none' | 'weekly' | 'yearly')}
          />
          {limitType !== 'none' && (
            <Input
              type="number"
              value={String(limitCount)}
              onChange={(e) => setLimitCount(Math.max(1, Number(e.target.value) || 1))}
              suffix={limitType === 'weekly' ? '次/周' : '次/年'}
            />
          )}
        </div>

        {err && <div className="publish-task-err">{err}</div>}
      </div>
    </Modal>
  );
}
