import { useState } from 'react';
import { Button, Card, Drawer, Input, Tag } from 'animal-island-ui';
import { Plus, Trash2, UserRound } from 'lucide-react';
import {
  deleteProfile,
  getActiveProfileId,
  getProfiles,
  saveProfile,
  setActiveProfileId,
} from '@/services';
import { notifyUserChanged } from '@/hooks/useUser';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ProfileSwitcher({ open, onClose }: Props) {
  const [tick, setTick] = useState(0);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('👦');

  const profiles = getProfiles();
  const activeId = getActiveProfileId();
  void tick;

  function switchTo(id: string) {
    setActiveProfileId(id);
    notifyUserChanged();
    onClose();
    setTimeout(() => window.location.reload(), 50);
  }

  function addProfile() {
    if (!newName.trim()) return;
    const id = `p-${Date.now()}`;
    saveProfile({ id, name: newName.trim(), emoji: newEmoji || '👤', createdAt: Date.now() });
    setNewName(''); setNewEmoji('👦');
    setTick((n) => n + 1);
  }

  function remove(id: string) {
    if (id === 'default') return;
    if (!confirm('确认删除此档案？相关积分与任务会一并清除')) return;
    deleteProfile(id);
    setTick((n) => n + 1);
  }

  return (
    <Drawer open={open} title="档案切换 & 管理" onClose={onClose} placement="left" width={340}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {profiles.map((p) => {
          const active = p.id === activeId;
          return (
            <Card
              key={p.id}
              color={active ? 'app-green' : 'default'}
              onClick={() => !active && switchTo(p.id)}
              style={{ cursor: active ? 'default' : 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 24 }}>{p.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{p.name}</div>
                  {active && <Tag size="small" color="app-green">当前档案</Tag>}
                </div>
                {p.id !== 'default' && (
                  <Button size="small" danger icon={<Trash2 size={12} />} onClick={(e) => { e.stopPropagation(); remove(p.id); }}>
                    删
                  </Button>
                )}
              </div>
            </Card>
          );
        })}

        <Card type="dashed">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <UserRound size={20} color="var(--c-muted)" />
            <span style={{ fontSize: 16, fontWeight: 600 }}>新增档案</span>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <Input placeholder="孩子名字" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <div style={{ width: 70 }}>
              <Input placeholder="🎈" value={newEmoji} onChange={(e) => setNewEmoji(e.target.value.slice(0, 4))} />
            </div>
          </div>
          <Button block type="primary" size="small" style={{ marginTop: 8 }} icon={<Plus size={13} />} onClick={addProfile}>
            添加
          </Button>
        </Card>
      </div>
    </Drawer>
  );
}
