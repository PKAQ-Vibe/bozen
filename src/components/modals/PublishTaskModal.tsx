import { useState } from 'react';
import { Button, Input, Modal, Radio, Select, Switch } from 'animal-island-ui';
import type { SubjectId, TaskKind, TaskTemplate } from '@/models';
import './PublishTaskModal.css';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (tpl: TaskTemplate, addToToday: boolean) => void;
}

const SUBJECT_OPTIONS: { key: SubjectId; label: string }[] = [
  { key: 'chinese', label: '语文' },
  { key: 'math', label: '数学' },
  { key: 'english', label: '英语' },
  { key: 'physics', label: '物理' },
  { key: 'chemistry', label: '化学' },
  { key: 'politics', label: '政治' },
  { key: 'history', label: '历史' },
  { key: 'geography', label: '地理' },
  { key: 'biology', label: '生物' },
  { key: 'reading', label: '阅读' },
  { key: 'sports', label: '运动' },
  { key: 'habit', label: '习惯' },
];

const KIND_OPTIONS = [
  { label: '必选', value: 'required' },
  { label: '自选', value: 'optional' },
  { label: '挑战', value: 'challenge' },
];

const DIFFICULTY_TO_BASE: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 40, 2: 60, 3: 80, 4: 110, 5: 150,
};

const DIFFICULTY_TO_TIME: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 15, 2: 20, 3: 30, 4: 40, 5: 55,
};

const CATEGORY_PRESETS = ['补习班', '每日复背', '每日习惯', '背默译', '课文熟读', '单词默写', '期末试题', '单元卷', '复习', '预习', '社会实践', '拓展鉴赏', '名著阅读'];

export default function PublishTaskModal({ open, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState<SubjectId>('math');
  const [difficulty, setDifficulty] = useState<1 | 2 | 3 | 4 | 5>(2);
  const [basePoints, setBasePoints] = useState(DIFFICULTY_TO_BASE[2]);
  const [standardMinutes, setStandardMinutes] = useState(DIFFICULTY_TO_TIME[2]);
  const [kind, setKind] = useState<TaskKind>('required');
  const [category, setCategory] = useState('');
  const [daily, setDaily] = useState(false);
  const [description, setDescription] = useState('');
  const [addToToday, setAddToToday] = useState(true);
  const [err, setErr] = useState('');

  // "补习班" 快捷预设
  function applyCoachingPreset() {
    setCategory('补习班');
    setDaily(true);
    setKind('required');
    setDifficulty(2);
    setBasePoints(30);
    setStandardMinutes(40);
  }

  function onDifficultyChange(v: string | number) {
    const d = Number(v) as 1 | 2 | 3 | 4 | 5;
    setDifficulty(d);
    setBasePoints(DIFFICULTY_TO_BASE[d]);
    setStandardMinutes(DIFFICULTY_TO_TIME[d]);
  }

  function reset() {
    setTitle(''); setSubject('math'); setDifficulty(2);
    setBasePoints(DIFFICULTY_TO_BASE[2]); setStandardMinutes(DIFFICULTY_TO_TIME[2]);
    setKind('required'); setCategory(''); setDaily(false);
    setDescription(''); setAddToToday(true); setErr('');
  }

  function handleSubmit() {
    if (!title.trim()) { setErr('请填任务标题'); return; }
    if (basePoints < 10 || basePoints > 300) { setErr('基础分建议 10-300'); return; }
    if (standardMinutes < 5 || standardMinutes > 180) { setErr('标准时间建议 5-180 分'); return; }
    const tpl: TaskTemplate = {
      id: `custom-${Date.now()}`,
      title: title.trim(),
      subject,
      difficulty,
      basePoints,
      standardMinutes,
      kind,
      description: description.trim() || undefined,
      category: category.trim() || undefined,
      once: !daily,
    };
    onSubmit(tpl, addToToday);
    reset();
    onClose();
  }

  return (
    <Modal
      open={open}
      title="发布新任务"
      typewriter={false}
      onClose={onClose}
      width={560}
      footer={
        <div className="modal-footer">
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={handleSubmit}>保存</Button>
        </div>
      }
    >
      <div className="publish-task-form">
        <div className="publish-task-row">
          <label className="publish-task-label">任务标题</label>
          <Input
            value={title}
            onChange={(e) => { setTitle(e.target.value); setErr(''); }}
            placeholder="如：数学练习册 第 3 章"
            allowClear
          />
        </div>

        <div className="publish-task-row publish-task-row--grid">
          <div>
            <label className="publish-task-label">学科</label>
            <Select
              options={SUBJECT_OPTIONS}
              value={subject}
              onChange={(k) => setSubject(k as SubjectId)}
            />
          </div>
          <div>
            <label className="publish-task-label">类型</label>
            <Radio
              options={KIND_OPTIONS}
              value={kind}
              onChange={(v) => setKind(v as TaskKind)}
              size="small"
            />
          </div>
        </div>

        <div className="publish-task-row">
          <label className="publish-task-label">难度</label>
          <Radio
            options={[1, 2, 3, 4, 5].map((d) => ({
              label: '★'.repeat(d),
              value: d,
            }))}
            value={difficulty}
            onChange={onDifficultyChange}
          />
          <div className="publish-task-hint">难度改变会自动填入建议的基础分与标准时间</div>
        </div>

        <div className="publish-task-row publish-task-row--grid">
          <div>
            <label className="publish-task-label">基础分（40-150 建议）</label>
            <Input
              type="number"
              value={String(basePoints)}
              onChange={(e) => setBasePoints(Number(e.target.value) || 0)}
              suffix="pts"
            />
          </div>
          <div>
            <label className="publish-task-label">标准时间（分钟，孩子不可改）</label>
            <Input
              type="number"
              value={String(standardMinutes)}
              onChange={(e) => setStandardMinutes(Number(e.target.value) || 0)}
              suffix="分"
            />
          </div>
        </div>

        <div className="publish-task-row">
          <label className="publish-task-label">分类 category（可选 · 学科内二级分组）</label>
          <Input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="补习班 / 背默译 / 单词默写 …"
            allowClear
          />
          <div className="publish-task-preset">
            {CATEGORY_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                className={`publish-task-chip ${category === c ? 'is-active' : ''}`}
                onClick={() => setCategory(c)}
              >{c}</button>
            ))}
            <button
              type="button"
              className="publish-task-chip publish-task-chip--coaching"
              onClick={applyCoachingPreset}
              title="补习班每日作业预设：分类=补习班 · 每日刷新 · 难度2 · 30分 · 40分钟"
            >⚡ 补习班每日预设</button>
          </div>
        </div>

        <div className="publish-task-row">
          <label className="publish-task-label">备注（可选）</label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="给孩子的说明或质量标准"
          />
        </div>

        <div className="publish-task-toggle">
          <span>每日刷新（关闭 = 一次性作业，仅当天生成）</span>
          <Switch checked={daily} onChange={setDaily} />
        </div>

        <div className="publish-task-toggle">
          <span>立刻加入今日任务</span>
          <Switch checked={addToToday} onChange={setAddToToday} />
        </div>

        {err && <div className="publish-task-err">{err}</div>}
      </div>
    </Modal>
  );
}
