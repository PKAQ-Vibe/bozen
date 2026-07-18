// 家长管理生活习惯：新增 / 编辑 / 删除 / 脚手架退场（调低积分）

import { useState } from 'react';
import { Button, Card, Input, Tag } from 'animal-island-ui';
import { Plus, Save, Trash2 } from 'lucide-react';
import {
  deleteCustomHabit,
  getCustomHabits,
  getSeedHabits,
  saveCustomHabit,
} from '@/services';
import type { HabitDef } from '@/models';

export default function HabitsManagePanel() {
  const [tick, setTick] = useState(0);
  const [nameInput, setNameInput] = useState('');
  const [emojiInput, setEmojiInput] = useState('✨');
  const [pointsInput, setPointsInput] = useState(5);

  const seedHabits = getSeedHabits();
  const customHabits = getCustomHabits();
  void tick;

  function add() {
    if (!nameInput.trim()) return;
    const h: HabitDef = {
      id: `habit-${Date.now()}`,
      label: nameInput.trim(),
      emoji: emojiInput.slice(0, 4) || '✨',
      points: Math.max(1, pointsInput || 1),
    };
    saveCustomHabit(h);
    setNameInput(''); setEmojiInput('✨'); setPointsInput(5);
    setTick((n) => n + 1);
  }

  function savePatch(h: HabitDef) {
    saveCustomHabit(h);
    setTick((n) => n + 1);
  }

  function del(id: string) {
    if (!confirm('确认删除此习惯？')) return;
    deleteCustomHabit(id);
    setTick((n) => n + 1);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Card>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700 }}>
          🏠 内置习惯
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {seedHabits.map((h) => (
            <Tag key={h.id} color="default" size="medium">
              {h.emoji} {h.label} · +{h.points}
            </Tag>
          ))}
        </div>
      </Card>

      <Card>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700 }}>➕ 新增家长自定义习惯</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'flex-start' }}>
          <div style={{ flex: 2 }}>
            <Input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="习惯名字（如：读课外书 30 分）" />
          </div>
          <div style={{ width: 70 }}>
            <Input value={emojiInput} onChange={(e) => setEmojiInput(e.target.value)} placeholder="🌟" />
          </div>
          <div style={{ width: 110 }}>
            <Input
              type="number"
              value={String(pointsInput)}
              onChange={(e) => setPointsInput(Number(e.target.value) || 0)}
              suffix="pts"
            />
          </div>
          <Button type="primary" icon={<Plus size={13} />} onClick={add}>添加</Button>
        </div>
      </Card>

      {customHabits.length === 0 && (
        <Card type="dashed" style={{ padding: 24, textAlign: 'center', color: 'var(--c-muted)' }}>
          还没有自定义习惯
        </Card>
      )}

      {customHabits.map((h) => (
        <Card key={h.id}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ width: 70 }}>
              <Input value={h.emoji} onChange={(e) => savePatch({ ...h, emoji: e.target.value.slice(0, 4) })} />
            </div>
            <div style={{ flex: 1 }}>
              <Input value={h.label} onChange={(e) => savePatch({ ...h, label: e.target.value })} />
            </div>
            <div style={{ width: 110 }}>
              <Input
                type="number"
                value={String(h.points)}
                onChange={(e) => savePatch({ ...h, points: Number(e.target.value) || 0 })}
                suffix="pts"
              />
            </div>
            <Button size="small" icon={<Save size={12} />} onClick={() => savePatch(h)}>保存</Button>
            <Button size="small" danger icon={<Trash2 size={12} />} onClick={() => del(h.id)}>删除</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
