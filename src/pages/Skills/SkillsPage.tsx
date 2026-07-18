import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Divider, Tabs, Tag, Title, Wallet } from 'animal-island-ui';
import type { CardColor, TabItem } from 'animal-island-ui';
import { ArrowRight } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { getAllUnits, getSubjectProgress, getTotalApproved } from '@/services';
import './SkillsPage.css';

/** 学科专属工具入口 */
interface ToolCard {
  emoji: string;
  title: string;
  desc: string;
  to: string;
  external?: boolean;
}

const SUBJECT_TOOLS: Record<string, ToolCard[]> = {
  english: [
    { emoji: '📚', title: '单词背诵', desc: '7 单元 · 471 词 · 记忆曲线复背', to: '/vocab' },
    { emoji: '🎬', title: '极速英语·同步视频', desc: '八上鲁教配套课时精讲 · 单元跳转', to: 'https://www.ncego.com/', external: true },
  ],
  math: [
    { emoji: '🎬', title: '八下数学同步视频', desc: '章节精讲 · 自动记录播放进度', to: '/videos/math' },
  ],
  chinese: [
    { emoji: '🎤', title: '古诗文听诵', desc: '开口念 · AI 清晰度判读 · 联动打卡', to: '/recite' },
  ],
  physics: [
    { emoji: '🧪', title: 'PhET 物理实验室', desc: 'HTML5 力学 / 电学互动仿真 · 中文界面', to: 'https://phet.colorado.edu/zh_CN/simulations/filter?subjects=physics&type=html', external: true },
  ],
  chemistry: [
    { emoji: '🧪', title: '元素周期表', desc: '标准 18 族 × 7 周期 · 前 20 号必背 · 惰性气体标注', to: '/periodic' },
    { emoji: '🧬', title: '化学用语大全', desc: '元素符号 · 化合价 · 化学式 · 常用方程式', to: '/chemistry-language' },
    { emoji: '⚗️', title: 'PhET 化学实验室', desc: 'HTML5 化学互动仿真 · 中文界面', to: 'https://phet.colorado.edu/zh_CN/simulations/filter?subjects=chemistry&type=html', external: true },
  ],
  history: [
    { emoji: '🎥', title: '文明', desc: '世界史纪录片 · 对应「观世界史纪录片」任务', to: 'https://www.bilibili.com/bangumi/play/ss23992?spm_id_from=333.337.0.0', external: true },
  ],
};

type SkillState = 'mastered' | 'current' | 'available' | 'locked';

interface SkillNode {
  key: string;
  name: string;
}

interface SkillBranch {
  key: string;
  name: string;
  emoji: string;
  nodes: SkillNode[];
}

interface SkillSubject {
  key: string;
  label: string;
  branches: SkillBranch[];
}

/** 按学科真实完成率把 N 个节点分档：
 *  0%          → 全部 locked
 *  (0, threshold] → 第 1 个 current，其余 locked
 *  每再多 1/N → 前进一格：已跨过的 mastered，正在跨的 current
 *  100%         → 全部 mastered */
function deriveStates(pct: number, count: number): SkillState[] {
  if (count === 0) return [];
  if (pct <= 0) return Array(count).fill('locked');
  if (pct >= 100) return Array(count).fill('mastered');
  const step = 100 / count;
  const filled = Math.floor(pct / step);
  const out: SkillState[] = [];
  for (let i = 0; i < count; i++) {
    if (i < filled) out.push('mastered');
    else if (i === filled) out.push('current');
    else if (i === filled + 1) out.push('available');
    else out.push('locked');
  }
  return out;
}

// 英语 4 支线（语音 / 词汇 / 阅读 / 写作）
const SUBJECTS: SkillSubject[] = [
  {
    key: 'english',
    label: '英语',
    branches: [
      { key: 'phonics', name: '语音', emoji: '🔤', nodes: [
        { key: 'ipa', name: '音标认读' },
        { key: 'rules', name: '拼读规则' },
        { key: 'fluent', name: '流利朗读' },
        { key: 'accent', name: '语调掌控' },
      ]},
      { key: 'vocab', name: '词汇', emoji: '📚', nodes: [
        { key: 'core', name: '核心单词' },
        { key: 'phrase', name: '词组短语' },
        { key: 'usage', name: '词汇运用' },
        { key: 'master', name: '词汇大师' },
      ]},
      { key: 'read', name: '阅读', emoji: '📖', nodes: [
        { key: 'short', name: '短文阅读' },
        { key: 'comp', name: '阅读理解' },
        { key: 'hard', name: '长难句' },
        { key: 'analysis', name: '篇章分析' },
      ]},
      { key: 'write', name: '写作', emoji: '✍️', nodes: [
        { key: 'note', name: '好句积累' },
        { key: 'model', name: '范文背诵' },
        { key: 'indep', name: '独立写作' },
        { key: 'poly', name: '优美文笔' },
      ]},
    ],
  },
  {
    key: 'math',
    label: '数学',
    branches: [
      { key: 'concept', name: '概念', emoji: '💡', nodes: [
        { key: 'basic', name: '基础概念' },
        { key: 'formula', name: '公式定理' },
        { key: 'system', name: '知识体系' },
        { key: 'model', name: '数学建模' },
      ]},
      { key: 'compute', name: '计算', emoji: '➗', nodes: [
        { key: 'ops', name: '运算能力' },
        { key: 'speed', name: '速算技巧' },
        { key: 'estimate', name: '估算' },
        { key: 'error', name: '零失误' },
      ]},
      { key: 'problem', name: '解题', emoji: '🎯', nodes: [
        { key: 'basic-drill', name: '基础刷题' },
        { key: 'summary', name: '题型归纳' },
        { key: 'variant', name: '变式训练' },
        { key: 'contest', name: '压轴题' },
      ]},
      { key: 'reflect', name: '复盘', emoji: '📓', nodes: [
        { key: 'wrong', name: '错题复盘' },
        { key: 'compress', name: '综合压轴' },
        { key: 'method', name: '方法总结' },
        { key: 'transfer', name: '举一反三' },
      ]},
    ],
  },
  {
    key: 'chinese',
    label: '语文',
    branches: [
      { key: 'guwen', name: '古诗文', emoji: '📜', nodes: [
        { key: 'recite', name: '背诵 61 篇' },
        { key: 'trans', name: '文言翻译' },
        { key: 'poem', name: '诗歌鉴赏' },
        { key: 'appre', name: '意境赏析' },
      ]},
      { key: 'reading', name: '阅读', emoji: '📖', nodes: [
        { key: 'modern', name: '现代文' },
        { key: 'novel', name: '小说阅读' },
        { key: 'essay', name: '散文品读' },
        { key: 'reflect', name: '批注思辨' },
      ]},
      { key: 'write', name: '作文', emoji: '✍️', nodes: [
        { key: 'material', name: '素材积累' },
        { key: 'structure', name: '篇章结构' },
        { key: 'style', name: '文笔提升' },
        { key: 'high', name: '高分作文' },
      ]},
      { key: 'base', name: '积累', emoji: '📝', nodes: [
        { key: 'word', name: '成语典故' },
        { key: 'quote', name: '名言警句' },
        { key: 'grammar', name: '基础语法' },
        { key: 'culture', name: '文化常识' },
      ]},
    ],
  },
  {
    key: 'chemistry',
    label: '化学',
    branches: [
      { key: 'symbol', name: '元素符号', emoji: '⚗️', nodes: [
        { key: 'elem', name: '元素符号' },
        { key: 'table', name: '元素周期表' },
        { key: 'valence', name: '化合价' },
        { key: 'formula', name: '化学式' },
      ]},
      { key: 'lang', name: '化学用语', emoji: '🧪', nodes: [
        { key: 'eq', name: '化学方程式' },
        { key: 'balance', name: '配平' },
        { key: 'ionic', name: '离子方程式' },
        { key: 'symbol', name: '符号书写' },
      ]},
      { key: 'concept', name: '概念', emoji: '💎', nodes: [
        { key: 'struct', name: '物质构成' },
        { key: 'class', name: '物质分类' },
        { key: 'react', name: '基本反应' },
        { key: 'law', name: '守恒定律' },
      ]},
      { key: 'exp', name: '实验', emoji: '🔬', nodes: [
        { key: 'safe', name: '实验安全' },
        { key: 'op', name: '基础操作' },
        { key: 'common', name: '常见实验' },
        { key: 'design', name: '实验设计' },
      ]},
    ],
  },
  {
    key: 'physics',
    label: '物理',
    branches: [
      { key: 'mech', name: '力学', emoji: '⚙️', nodes: [
        { key: 'force', name: '力与运动' },
        { key: 'pressure', name: '压强' },
        { key: 'work', name: '功和能' },
        { key: 'lever', name: '简单机械' },
      ]},
      { key: 'elec', name: '电学', emoji: '🔌', nodes: [
        { key: 'circuit', name: '电路' },
        { key: 'ohm', name: '欧姆定律' },
        { key: 'power', name: '电功率' },
        { key: 'safe', name: '家庭电路' },
      ]},
    ],
  },
  {
    key: 'history',
    label: '历史',
    branches: [
      { key: 'world', name: '世界史', emoji: '🌏', nodes: [
        { key: 'ancient', name: '古代文明' },
        { key: 'medieval', name: '中世纪' },
        { key: 'industrial', name: '工业革命' },
        { key: 'modern', name: '两次世界大战' },
      ]},
    ],
  },
];

const STATE_META: Record<SkillState, { label: string; color: CardColor; badgeColor: 'app-green' | 'app-yellow' | 'default' | 'brown' }> = {
  mastered: { label: '已掌握', color: 'lime-green', badgeColor: 'app-green' },
  current: { label: '进行中', color: 'app-yellow', badgeColor: 'app-yellow' },
  available: { label: '可解锁', color: 'default', badgeColor: 'app-yellow' },
  locked: { label: '未解锁', color: 'brown', badgeColor: 'default' },
};

export default function SkillsPage() {
  const [subjectKey, setSubjectKey] = useState('english');
  const subject = useMemo(() => SUBJECTS.find((s) => s.key === subjectKey) ?? SUBJECTS[0], [subjectKey]);
  const skillPoints = Math.floor(getTotalApproved() / 3);

  const items: TabItem[] = SUBJECTS.map((s) => ({
    key: s.key,
    label: s.label,
    children: <SubjectPanel subject={s} />,
  }));

  return (
    <>
      <PageHeader
        title={`学科中心 · ${subject.label}`}
        sub="学科专属工具 + 技能成长树 · 完成任务积累经验"
        extra={<Wallet value={skillPoints} size="small" icon={<span style={{ fontSize: 20 }}>⭐</span>} />}
      />
      <div className="page-body skills-page">
        <Tabs items={items} activeKey={subjectKey} onChange={setSubjectKey} leafAnimation={false} />
      </div>
    </>
  );
}

/* ───────── 学科面板：进度头卡 + 学科工具 + 技能树 ───────── */

function SubjectPanel({ subject }: { subject: SkillSubject }) {
  const progress = getSubjectProgress()[subject.key] ?? { done: 0, total: 0, pct: 0 };
  const tools = SUBJECT_TOOLS[subject.key] ?? [];
  // 英语单元数
  const englishUnits = subject.key === 'english' ? getAllUnits().length : 0;

  return (
    <div className="subject-panel">
      {/* 进度头卡 */}
      <Card className="subject-progress">
        <div className="subject-progress__row">
          <div className="subject-progress__stat">
            <div className="subject-progress__num">{progress.done}</div>
            <div className="subject-progress__label">已通过任务</div>
          </div>
          <div className="subject-progress__stat">
            <div className="subject-progress__num">{progress.total}</div>
            <div className="subject-progress__label">总任务</div>
          </div>
          <div className="subject-progress__stat">
            <div className="subject-progress__num" style={{ color: progress.pct >= 60 ? 'var(--c-green)' : 'var(--c-orange)' }}>{progress.pct}%</div>
            <div className="subject-progress__label">完成率</div>
          </div>
          {subject.key === 'english' && (
            <div className="subject-progress__stat">
              <div className="subject-progress__num">{englishUnits}</div>
              <div className="subject-progress__label">词汇单元</div>
            </div>
          )}
        </div>
      </Card>

      {/* 学科工具卡 */}
      <Title size="small" color="app-yellow">🛠 {subject.label} 学科工具</Title>
      {tools.length > 0 ? (
        <div className="subject-tools">
          {tools.map((t) => {
            const inner = (
              <Card color="app-yellow" className="subject-tool-card">
                <div className="subject-tool-card__emoji">{t.emoji}</div>
                <div className="subject-tool-card__body">
                  <div className="subject-tool-card__title">
                    {t.title}
                    {t.external && <span className="subject-tool-card__ext"> ↗</span>}
                  </div>
                  <div className="subject-tool-card__desc">{t.desc}</div>
                </div>
                <Button size="small" type="primary" icon={<ArrowRight size={12} />}>进入</Button>
              </Card>
            );
            return t.external ? (
              <a key={t.to} href={t.to} target="_blank" rel="noreferrer" className="subject-tool-link">
                {inner}
              </a>
            ) : (
              <Link key={t.to} to={t.to} className="subject-tool-link">
                {inner}
              </Link>
            );
          })}
        </div>
      ) : (
        <Card type="dashed" className="subject-tools-empty">
          该学科暂无专属工具
        </Card>
      )}

      {/* 技能树 */}
      <div className="skills-tree-head">
        <Title size="small" color="app-green">🌳 技能成长树</Title>
        <div className="skills-tree-legend" aria-label="技能状态图例">
          {(['mastered', 'current', 'available', 'locked'] as SkillState[]).map((s) => (
            <span key={s} className="skills-legend__item">
              <span className={`skills-legend__dot skills-legend__dot--${s}`} />
              {STATE_META[s].label}
            </span>
          ))}
        </div>
      </div>
      <SubjectTree subject={subject} />
    </div>
  );
}

function SubjectTree({ subject }: { subject: SkillSubject }) {
  const progress = getSubjectProgress()[subject.key] ?? { done: 0, total: 0, pct: 0 };
  return (
    <div className="skills-tree">
      {subject.branches.map((b) => {
        const states = deriveStates(progress.pct, b.nodes.length);
        return (
          <div key={b.key} className="skills-branch">
            <Title size="small" color="app-green" className="skills-branch__title">
              {b.emoji} {b.name}
            </Title>
            <Divider type="line-teal" />
            <div className="skills-branch__nodes">
              {b.nodes.map((n, idx) => (
                <SkillNodeCard
                  key={n.key}
                  node={n}
                  state={states[idx]}
                  tier={idx + 1}
                  isLast={idx === b.nodes.length - 1}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SkillNodeCard({ node, state, tier, isLast }: { node: SkillNode; state: SkillState; tier: number; isLast: boolean }) {
  const meta = STATE_META[state];
  return (
    <>
      <Card color={meta.color} className={`skills-node skills-node--${state}`}>
        <div className="skills-node__tier">Tier {tier}</div>
        <div className="skills-node__name" title={`${node.name} · ${meta.label}`}>{node.name}</div>
        <Tag size="small" color={meta.badgeColor} variant={state === 'locked' ? 'dashed' : 'solid'}>
          {meta.label}
        </Tag>
      </Card>
      {!isLast && <span className={`skills-conn skills-conn--${state === 'mastered' ? 'on' : 'off'}`} />}
    </>
  );
}
