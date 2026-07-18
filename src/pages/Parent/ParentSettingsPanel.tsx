// 家长设置面板：§4.1 动态校准 + §6.2 脚手架退场
// 可在此调整任务模板的基础分 / 标准时间 / 启用与否，或删除已养成的习惯

import { useMemo, useState } from 'react';
import { Button, Card, Input, Switch, Tabs, Tag } from 'animal-island-ui';
import type { TabItem } from 'animal-island-ui';
import { Save, Trash2 } from 'lucide-react';
import {
  deleteCustomTemplate,
  getAllTemplates,
  getCustomTemplates,
  getOverrides,
  resetOverride as svcResetOverride,
  saveCustomTemplate,
  seedTaskTemplates,
  setOverrides as svcSetOverrides,
  updateOverride as svcUpdateOverride,
} from '@/services';
import type { TaskTemplate } from '@/models';
import type { TemplateOverride } from '@/services';
import './ParentSettingsPanel.css';

type Override = TemplateOverride;

export default function ParentSettingsPanel() {
  const [overrides, setOverridesLocal] = useState<Record<string, Override>>(getOverrides());
  const [tick, setTick] = useState(0);

  const seedList = seedTaskTemplates;
  const customList = useMemo(() => getCustomTemplates(), [tick]);

  function updateOverride(id: string, patch: Partial<Override>) {
    svcUpdateOverride(id, patch);
    setOverridesLocal(getOverrides());
  }

  function resetOverride(id: string) {
    svcResetOverride(id);
    setOverridesLocal(getOverrides());
  }

  function bulkScaleDown(subjectPrefix: 'habit' | 'all', ratio = 0.7) {
    const next = { ...overrides };
    for (const t of getAllTemplates()) {
      if (subjectPrefix === 'habit' && t.subject !== 'habit') continue;
      const eff = next[t.id] ?? {};
      next[t.id] = {
        ...eff,
        basePoints: Math.max(5, Math.round((eff.basePoints ?? t.basePoints) * ratio)),
      };
    }
    svcSetOverrides(next);
    setOverridesLocal(next);
  }

  const items: TabItem[] = [
    {
      key: 'seed',
      label: '内置模板',
      children: (
        <TemplateTable
          list={seedList}
          overrides={overrides}
          onOverride={updateOverride}
          onReset={resetOverride}
        />
      ),
    },
    {
      key: 'custom',
      label: `家长模板（${customList.length}）`,
      children: (
        <CustomTemplateTable
          list={customList}
          onSave={(t) => {
            saveCustomTemplate(t);
            setTick((n) => n + 1);
          }}
          onDelete={(id) => {
            deleteCustomTemplate(id);
            setTick((n) => n + 1);
          }}
        />
      ),
    },
  ];

  return (
    <div className="parent-settings">
      <Card className="parent-settings__hero">
        <div className="parent-settings__hero-title">📐 任务与习惯校准</div>
        <div className="parent-settings__hero-desc">
          根据实际用时调整标准时间；习惯稳定后可逐步降低积分，把激励移到新目标上。
        </div>
        <div className="parent-settings__hero-actions">
          <Button size="small" onClick={() => bulkScaleDown('habit', 0.5)}>习惯积分打 5 折</Button>
          <Button size="small" onClick={() => bulkScaleDown('habit', 0.2)}>习惯积分打 2 折</Button>
          <Button size="small" onClick={() => bulkScaleDown('all', 0.8)}>全部×0.8</Button>
        </div>
      </Card>

      <Tabs items={items} defaultActiveKey="seed" leafAnimation={false} />
    </div>
  );
}

interface TemplateTableProps {
  list: TaskTemplate[];
  overrides: Record<string, Override>;
  onOverride: (id: string, patch: Partial<Override>) => void;
  onReset: (id: string) => void;
}

function TemplateTable({ list, overrides, onOverride, onReset }: TemplateTableProps) {
  return (
    <div className="template-table">
      <div className="template-row template-row--head">
        <span>标题</span>
        <span>学科</span>
        <span>难度</span>
        <span>基础分（可校准）</span>
        <span>标准分钟（可校准）</span>
        <span>启用</span>
        <span>操作</span>
      </div>
      {list.map((t) => {
        const o = overrides[t.id] ?? {};
        const effPts = o.basePoints ?? t.basePoints;
        const effMin = o.standardMinutes ?? t.standardMinutes;
        const disabled = o.disabled ?? false;
        const dirty = o.basePoints != null || o.standardMinutes != null;
        return (
          <div key={t.id} className={`template-row ${disabled ? 'template-row--dis' : ''}`}>
            <span className="template-row__title">
              {t.title}
              {dirty && <Tag size="small" color="app-orange" style={{ marginLeft: 6 }}>已校准</Tag>}
            </span>
            <span>{t.subject}</span>
            <span>{'★'.repeat(t.difficulty)}</span>
            <Input
              size="small"
              type="number"
              value={String(effPts)}
              onChange={(e) => onOverride(t.id, { basePoints: Number(e.target.value) || 0 })}
              suffix="pts"
            />
            <Input
              size="small"
              type="number"
              value={String(effMin)}
              onChange={(e) => onOverride(t.id, { standardMinutes: Number(e.target.value) || 0 })}
              suffix="分"
            />
            <Switch
              checked={!disabled}
              onChange={(v) => onOverride(t.id, { disabled: !v })}
            />
            {dirty || disabled ? (
              <Button size="small" onClick={() => onReset(t.id)}>还原</Button>
            ) : (
              <span className="template-row__hint">—</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface CustomTableProps {
  list: TaskTemplate[];
  onSave: (t: TaskTemplate) => void;
  onDelete: (id: string) => void;
}

function CustomTemplateTable({ list, onSave, onDelete }: CustomTableProps) {
  if (list.length === 0) {
    return (
      <Card type="dashed" className="template-empty">
        还没有自定义模板 · 请在头部「发布任务」处新增
      </Card>
    );
  }
  return (
    <div className="template-table">
      <div className="template-row template-row--head">
        <span>标题</span>
        <span>学科</span>
        <span>难度</span>
        <span>基础分</span>
        <span>标准分钟</span>
        <span>类型</span>
        <span>操作</span>
      </div>
      {list.map((t) => (
        <div key={t.id} className="template-row">
          <Input
            size="small"
            value={t.title}
            onChange={(e) => onSave({ ...t, title: e.target.value })}
          />
          <span>{t.subject}</span>
          <span>{'★'.repeat(t.difficulty)}</span>
          <Input
            size="small"
            type="number"
            value={String(t.basePoints)}
            onChange={(e) => onSave({ ...t, basePoints: Number(e.target.value) || 0 })}
            suffix="pts"
          />
          <Input
            size="small"
            type="number"
            value={String(t.standardMinutes)}
            onChange={(e) => onSave({ ...t, standardMinutes: Number(e.target.value) || 0 })}
            suffix="分"
          />
          <span>{t.kind}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <Button size="small" icon={<Save size={12} />} onClick={() => onSave(t)}>保存</Button>
            <Button size="small" danger icon={<Trash2 size={12} />} onClick={() => onDelete(t.id)}>删除</Button>
          </div>
        </div>
      ))}
    </div>
  );
}
