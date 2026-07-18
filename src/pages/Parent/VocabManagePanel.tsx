// 家长端 · 词表管理
// 单元列表 + 粘贴导入 + 逐个编辑

import { useMemo, useState } from 'react';
import { Button, Card, Input, Modal, Radio, Tabs, Tag, Title } from 'animal-island-ui';
import type { TabItem } from 'animal-island-ui';
import { Import, Plus, Trash2 } from 'lucide-react';
import { getAllUnits, parseWordText, saveCustomUnit } from '@/services';
import type { VocabUnit, VocabWord } from '@/models';

export default function VocabManagePanel() {
  const [tick, setTick] = useState(0);
  const [selectedId, setSelectedId] = useState<string>('');
  const [importOpen, setImportOpen] = useState(false);
  const units = useMemo(() => getAllUnits(), [tick]);
  const selected = units.find((u) => u.id === selectedId) ?? units[0];

  function refresh() { setTick((n) => n + 1); }

  function addUnit() {
    const no = `Unit ${units.length + 1}`;
    const unit: VocabUnit = {
      id: `custom-u-${Date.now()}`,
      no,
      title: '新单元 · 请编辑标题',
      book: 'english-8up-custom',
      words: [],
    };
    saveCustomUnit(unit);
    setSelectedId(unit.id);
    refresh();
  }

  const tabs: TabItem[] = [
    {
      key: 'overview',
      label: '📖 单元总览',
      children: (
        <UnitOverview
          units={units}
          onSelect={(id) => setSelectedId(id)}
          onImportClick={(id) => { setSelectedId(id); setImportOpen(true); }}
          onAddUnit={addUnit}
        />
      ),
    },
    {
      key: 'edit',
      label: `✏️ 编辑${selected ? ' · ' + selected.no : ''}`,
      children: selected ? (
        <UnitEditor
          unit={selected}
          onImportClick={() => setImportOpen(true)}
          onSave={(u) => { saveCustomUnit(u); refresh(); }}
        />
      ) : (
        <Card type="dashed" style={{ padding: 24, textAlign: 'center' }}>请先选择单元</Card>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card>
        <Title size="small" color="app-green">📖 英语词表管理</Title>
        <div style={{ fontSize: 16, color: 'var(--c-mid)', marginTop: 4 }}>
          从课本抄词后粘贴到「导入词表」框，一次一整单元 · 支持 <code>en, zh</code> · <code>en\tzh</code> · <code>en — zh</code> 多种分隔
        </div>
      </Card>

      <Tabs items={tabs} defaultActiveKey="overview" leafAnimation={false} />

      {importOpen && selected && (
        <ImportModal
          unit={selected}
          onClose={() => setImportOpen(false)}
          onImport={(words, mode) => {
            const next = { ...selected, words: mode === 'replace' ? words : [...selected.words, ...words] };
            saveCustomUnit(next);
            setImportOpen(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function UnitOverview({
  units,
  onSelect,
  onImportClick,
  onAddUnit,
}: {
  units: VocabUnit[];
  onSelect: (id: string) => void;
  onImportClick: (id: string) => void;
  onAddUnit: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {units.map((u) => (
        <Card key={u.id}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, minWidth: 60 }}>{u.no}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{u.title}</div>
              <div style={{ fontSize: 16, color: 'var(--c-muted)' }}>
                {u.words.length === 0 ? '⚠️ 待补充' : `${u.words.length} 词`} · {u.pageRange || '页码待补'}
              </div>
            </div>
            <Button size="small" onClick={() => onSelect(u.id)}>编辑</Button>
            <Button size="small" type="primary" icon={<Import size={12} />} onClick={() => onImportClick(u.id)}>
              粘贴导入
            </Button>
          </div>
        </Card>
      ))}
      <Card type="dashed">
        <Button block type="primary" icon={<Plus size={13} />} onClick={onAddUnit}>新增单元（超出课本 6 单元时用）</Button>
      </Card>
    </div>
  );
}

function UnitEditor({
  unit,
  onImportClick,
  onSave,
}: {
  unit: VocabUnit;
  onImportClick: () => void;
  onSave: (u: VocabUnit) => void;
}) {
  const [title, setTitle] = useState(unit.title);
  const [pageRange, setPageRange] = useState(unit.pageRange ?? '');
  const [words, setWords] = useState<VocabWord[]>(unit.words);

  function patchWord(i: number, patch: Partial<VocabWord>) {
    setWords((ws) => ws.map((w, idx) => (idx === i ? { ...w, ...patch } : w)));
  }
  function delWord(i: number) {
    setWords((ws) => ws.filter((_, idx) => idx !== i));
  }
  function addWord() {
    setWords((ws) => [...ws, { id: `w-new-${Date.now()}`, en: '', zh: '' }]);
  }
  function saveAll() {
    onSave({ ...unit, title, pageRange, words });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Card>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ flex: 2 }}>
            <div style={{ fontSize: 16, color: 'var(--c-muted)', marginBottom: 2 }}>单元标题</div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, color: 'var(--c-muted)', marginBottom: 2 }}>教材页码</div>
            <Input value={pageRange} onChange={(e) => setPageRange(e.target.value)} placeholder="P4-15" />
          </div>
          <Button type="primary" onClick={saveAll}>保存</Button>
          <Button icon={<Import size={12} />} onClick={onImportClick}>粘贴导入</Button>
        </div>
      </Card>

      {words.length === 0 && (
        <Card type="dashed" style={{ padding: 24, textAlign: 'center', color: 'var(--c-muted)' }}>
          此单元还没有单词 · 用「粘贴导入」批量添加，或点下面 ➕ 逐个添加
        </Card>
      )}

      {words.map((w, i) => (
        <Card key={w.id}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 16, color: 'var(--c-muted)', minWidth: 30 }}>#{i + 1}</span>
            <div style={{ flex: 2 }}>
              <Input value={w.en} onChange={(e) => patchWord(i, { en: e.target.value })} placeholder="英文" />
            </div>
            <div style={{ width: 90 }}>
              <Input value={w.pos ?? ''} onChange={(e) => patchWord(i, { pos: e.target.value })} placeholder="n./v./adj." />
            </div>
            <div style={{ flex: 2 }}>
              <Input value={w.zh} onChange={(e) => patchWord(i, { zh: e.target.value })} placeholder="中文" />
            </div>
            <Button size="small" danger icon={<Trash2 size={12} />} onClick={() => delWord(i)}>删</Button>
          </div>
          {w.example !== undefined && (
            <div style={{ marginTop: 6 }}>
              <Input value={w.example} onChange={(e) => patchWord(i, { example: e.target.value })} placeholder="例句（可选）" />
            </div>
          )}
        </Card>
      ))}

      <Card type="dashed">
        <Button block icon={<Plus size={13} />} onClick={addWord}>➕ 添加一个单词</Button>
      </Card>
    </div>
  );
}

function ImportModal({
  unit,
  onClose,
  onImport,
}: {
  unit: VocabUnit;
  onClose: () => void;
  onImport: (words: VocabWord[], mode: 'append' | 'replace') => void;
}) {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'append' | 'replace'>('append');
  const parsed = useMemo(() => parseWordText(text), [text]);

  return (
    <Modal
      open
      title={`粘贴导入 · ${unit.no}`}
      typewriter={false}
      onClose={onClose}
      width={640}
      footer={
        <div className="modal-footer">
          <Button onClick={onClose}>取消</Button>
          <Button
            type="primary"
            disabled={parsed.length === 0}
            onClick={() => onImport(parsed, mode)}
          >
            {mode === 'replace' ? `覆盖导入 ${parsed.length} 个` : `追加 ${parsed.length} 个`}
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 16, color: 'var(--c-mid)' }}>
          每行一个单词 · 格式支持：<br />
          <code>apple, 苹果</code> · <code>apple  苹果</code>（Tab 分隔）· <code>apple — n. 苹果</code>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`example, 例子\nvocabulary, n. 词汇\nremember, v. 记得`}
          rows={12}
          style={{
            width: '100%',
            padding: 12,
            fontFamily: 'monospace',
            fontSize: 16,
            border: '1px solid var(--c-border)',
            borderRadius: 8,
            resize: 'vertical',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 16, color: 'var(--c-muted)' }}>导入方式：</span>
          <Radio
            value={mode}
            onChange={(v) => setMode(v as 'append' | 'replace')}
            options={[
              { label: '追加到现有列表', value: 'append' },
              { label: '覆盖（先清空）', value: 'replace' },
            ]}
          />
          <div style={{ flex: 1 }} />
          <Tag color={parsed.length > 0 ? 'app-green' : 'default'} size="small">
            识别 {parsed.length} 个单词
          </Tag>
        </div>
        {parsed.length > 0 && (
          <Card>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>预览</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 16 }}>
              {parsed.slice(0, 20).map((w) => (
                <div key={w.id}>
                  <strong>{w.en}</strong>
                  {w.pos && <span style={{ color: 'var(--c-muted)' }}> {w.pos}</span>}
                  {' · '}{w.zh}
                </div>
              ))}
              {parsed.length > 20 && (
                <div style={{ gridColumn: '1/-1', color: 'var(--c-muted)', textAlign: 'center' }}>
                  ...再往下 {parsed.length - 20} 个
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </Modal>
  );
}
