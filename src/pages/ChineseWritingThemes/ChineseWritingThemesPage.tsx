import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Tag, Title } from 'animal-island-ui';
import { ArrowLeft } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import './ChineseWritingThemesPage.css';

interface WritingTheme {
  topic: string;
  title: string;
  group: string;
  material: string;
}

const THEMES: WritingTheme[] = [
  { topic: '青春', title: '青春正当时', group: '成长励志', material: '一次主动尝试或自我突破' },
  { topic: '奋斗', title: '奋斗，在舞台上回响', group: '成长励志', material: '训练、比赛与反复打磨' },
  { topic: '梦想', title: '梦想的烙印', group: '成长励志', material: '从向往到付诸行动的过程' },
  { topic: '阅读', title: '书页中的温情', group: '学习生活', material: '一本书与一次心灵共鸣' },
  { topic: '发现', title: '这，也是收获', group: '生活哲思', material: '从失败或细节中获得新认识' },
  { topic: '坚持', title: '我学会了坚持', group: '成长励志', material: '受挫、调整、再次出发' },
  { topic: '亲情', title: '栀子花又开', group: '真情人际', material: '一件旧物、一种气味或一个动作' },
  { topic: '文化', title: '触动心灵的旅程', group: '文化家国', material: '参观古迹或体验传统技艺' },
  { topic: '回忆', title: '相册里的故事', group: '真情人际', material: '照片唤起的一段成长往事' },
  { topic: '追求', title: '向光而行', group: '成长励志', material: '确定目标并克服惰性' },
  { topic: '哲思', title: '回甘', group: '生活哲思', material: '由苦到甜的一次体验' },
  { topic: '榜样', title: '因为有你在我前方', group: '真情人际', material: '身边人物的言行带来改变' },
  { topic: '选择', title: '这一次，我选择停下', group: '生活哲思', material: '在快与慢、得与失间重新判断' },
  { topic: '团结', title: '团结的力量', group: '责任品格', material: '团队合作解决共同难题' },
  { topic: '自然', title: '一棵树的青春启示录', group: '自然审美', material: '观察植物四季变化获得启示' },
  { topic: '劳动', title: '在劳动中成长', group: '责任品格', material: '家务、农事或志愿劳动' },
  { topic: '责任', title: '我懂得了责任', group: '责任品格', material: '从逃避到主动承担' },
  { topic: '挑战', title: '登顶，触景', group: '成长励志', material: '登山或完成高难度目标' },
  { topic: '师生情', title: '越走近，越懂得', group: '真情人际', material: '误解老师后理解其用心' },
  { topic: '价值', title: '在那片白桦林里', group: '生活哲思', material: '平凡生命带来的价值思考' },
  { topic: '勇气', title: '登峰之路，勇气为径', group: '成长励志', material: '面对害怕仍迈出第一步' },
  { topic: '传承', title: '木格之上，传承绽放', group: '文化家国', material: '学习并传播一项传统技艺' },
  { topic: '运动', title: '在晨跑中成长', group: '学习生活', material: '运动习惯塑造意志与节奏' },
  { topic: '热爱', title: '努力成为一束光', group: '成长励志', material: '从个人兴趣走向分享与传递' },
  { topic: '态度', title: '这一次，我不再怯懦', group: '责任品格', material: '面对误解或压力保持从容' },
  { topic: '尊重', title: '于细微处，看见尊重', group: '责任品格', material: '关注一位普通劳动者' },
  { topic: '乐观', title: '微笑伴我前行', group: '成长励志', material: '在困境中调整看问题的角度' },
  { topic: '乡情', title: '思念深深，乡情悠悠', group: '文化家国', material: '故乡风物与亲人的共同记忆' },
  { topic: '爱国', title: '探寻黄河之魂', group: '文化家国', material: '山河景观连接历史与民族精神' },
  { topic: '欣赏', title: '石头上的绿意', group: '自然审美', material: '重新发现微小生命的美' },
];

const GROUPS = ['全部', ...Array.from(new Set(THEMES.map((theme) => theme.group)))];

const GROUP_TEMPLATE: Record<string, { conflict: string; turn: string; ending: string }> = {
  成长励志: { conflict: '目标受阻，写清“想放弃”的真实原因', turn: '一个动作、一句话或一次自省带来转折', ending: '从完成一件事升华到形成一种品格' },
  学习生活: { conflict: '日常节奏被困难或倦怠打乱', turn: '在实践中找到新的方法与意义', ending: '回扣学习不是任务，而是持续生长' },
  生活哲思: { conflict: '先写原有认知与现实发生碰撞', turn: '借细节或对比完成认知反转', ending: '由个人感受提炼普遍道理，但不喊口号' },
  真情人际: { conflict: '用误解、疏离或沉默制造情感落差', turn: '一个细微举动揭示对方未说出口的关心', ending: '以旧物、景物或动作照应开头' },
  文化家国: { conflict: '传统与当下、个人与家国之间产生距离', turn: '亲身体验让抽象文化变得可触可感', ending: '落到青年能做的一件具体小事' },
  责任品格: { conflict: '利益、畏难与应尽责任发生冲突', turn: '看见他人的坚守后作出主动选择', ending: '用行动证明品格，而非直接评价自己' },
  自然审美: { conflict: '最初忽略、误解或厌弃眼前景物', turn: '细致观察生命变化，发现隐藏的力量', ending: '由景及人，以同一意象收束全文' },
};

function MindMap({ theme }: { theme: WritingTheme }) {
  const template = GROUP_TEMPLATE[theme.group];
  const nodes = [
    ['立意', `${theme.topic}不是口号，而是一次具体改变`],
    ['素材', theme.material],
    ['冲突', template.conflict],
    ['转折', template.turn],
    ['升华', template.ending],
  ];
  return (
    <div className="writing-mindmap" aria-label={`${theme.topic}主题写作脑图`}>
      <div className="writing-mindmap__center"><span>{theme.topic}</span><small>{theme.title}</small></div>
      <div className="writing-mindmap__branches">
        {nodes.map(([label, text], index) => (
          <div className={`writing-mindmap__node writing-mindmap__node--${index + 1}`} key={label}>
            <strong>{label}</strong><span>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ChineseWritingThemesPage() {
  const [group, setGroup] = useState('全部');
  const [selectedTopic, setSelectedTopic] = useState(THEMES[0].topic);
  const visibleThemes = useMemo(() => group === '全部' ? THEMES : THEMES.filter((theme) => theme.group === group), [group]);
  const selected = THEMES.find((theme) => theme.topic === selectedTopic) ?? THEMES[0];
  const template = GROUP_TEMPLATE[selected.group];

  return (
    <>
      <PageHeader
        title="2026 中考作文热点模板"
        sub="30 个高频主题 · 分类标签 · 结构化写作脑图"
        extra={<Link to="/resources"><Button size="small" icon={<ArrowLeft size={16} />}>返回学习资源</Button></Link>}
      />
      <div className="page-body writing-page">
        <div className="writing-filters" aria-label="主题分类">
          {GROUPS.map((item) => <button key={item} className={group === item ? 'is-active' : ''} onClick={() => setGroup(item)}>{item}</button>)}
        </div>

        <Card color="brown" className="writing-checklist">
          <Title size="small" color="app-yellow">✅ 套用前检查</Title>
          <span>主题是否落在真实事件上</span><span>是否有动作、语言或景物细节</span><span>转折是否自然</span><span>首尾意象是否呼应</span>
        </Card>

        <div className="writing-workspace">
          <aside className="writing-sidebar">
            <div className="writing-theme-grid">
              {visibleThemes.map((theme, index) => (
                <button
                  key={theme.topic}
                  className={`writing-theme-card ${selected.topic === theme.topic ? 'is-active' : ''}`}
                  onClick={() => setSelectedTopic(theme.topic)}
                >
                  <span className="writing-theme-card__num">{String(THEMES.indexOf(theme) + 1).padStart(2, '0')}</span>
                  <span className="writing-theme-card__body"><strong>{theme.topic}</strong><small>{theme.title}</small></span>
                  <Tag size="small" color={index % 2 === 0 ? 'app-green' : 'app-yellow'}>{theme.group}</Tag>
                </button>
              ))}
            </div>
          </aside>

          <Card className="writing-template">
            <div className="writing-template__head">
              <div><Title size="small" color="app-green">🧠 {selected.topic} · 写作脑图</Title><p>参考题目：《{selected.title}》</p></div>
              <Tag color="purple">{selected.group}</Tag>
            </div>
            <MindMap theme={selected} />
            <div className="writing-outline">
              <section><b>开头 · 设境点题</b><span>用一个可感知的场景或动作切入，控制在 80 字内，不先讲大道理。</span></section>
              <section><b>发展 · 困境加深</b><span>{template.conflict}</span></section>
              <section><b>转折 · 细节触发</b><span>{template.turn}</span></section>
              <section><b>结尾 · 回扣升华</b><span>{template.ending}</span></section>
            </div>
          </Card>
        </div>

      </div>
    </>
  );
}
