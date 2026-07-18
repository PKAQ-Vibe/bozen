import { Link } from 'react-router-dom';
import { Button, Card, Tag, Title } from 'animal-island-ui';
import { ArrowLeft } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import './ChemistryLanguagePage.css';

const ELEMENTS = [
  ['H', '氢'], ['C', '碳'], ['N', '氮'], ['O', '氧'], ['F', '氟'], ['P', '磷'], ['S', '硫'], ['Cl', '氯'],
  ['Na', '钠'], ['Mg', '镁'], ['Al', '铝'], ['K', '钾'], ['Ca', '钙'], ['Fe', '铁'], ['Cu', '铜'], ['Zn', '锌'], ['Ag', '银'], ['Ba', '钡'],
];

const IONS = [
  ['H⁺', '氢离子'], ['Na⁺', '钠离子'], ['K⁺', '钾离子'], ['Ag⁺', '银离子'], ['NH₄⁺', '铵根离子'],
  ['Mg²⁺', '镁离子'], ['Ca²⁺', '钙离子'], ['Ba²⁺', '钡离子'], ['Zn²⁺', '锌离子'], ['Cu²⁺', '铜离子'],
  ['Fe²⁺', '亚铁离子'], ['Fe³⁺', '铁离子'], ['Al³⁺', '铝离子'], ['Cl⁻', '氯离子'], ['OH⁻', '氢氧根离子'],
  ['NO₃⁻', '硝酸根离子'], ['SO₄²⁻', '硫酸根离子'], ['CO₃²⁻', '碳酸根离子'],
];

const SUBSTANCES = [
  ['H₂', '氢气'], ['O₂', '氧气'], ['N₂', '氮气'], ['Cl₂', '氯气'], ['H₂O', '水'], ['CO₂', '二氧化碳'],
  ['CO', '一氧化碳'], ['HCl', '氯化氢'], ['H₂SO₄', '硫酸'], ['HNO₃', '硝酸'], ['NaOH', '氢氧化钠'],
  ['Ca(OH)₂', '氢氧化钙'], ['NaCl', '氯化钠'], ['CaCO₃', '碳酸钙'], ['CuSO₄', '硫酸铜'],
  ['Fe₂O₃', '氧化铁'], ['Al₂O₃', '氧化铝'], ['KMnO₄', '高锰酸钾'],
];

const EQUATION_GROUPS = [
  { title: '化合反应', rows: [
    ['2H₂ + O₂ → 2H₂O', '氢气燃烧'], ['C + O₂ → CO₂', '碳充分燃烧'], ['S + O₂ → SO₂', '硫燃烧'],
    ['3Fe + 2O₂ → Fe₃O₄', '铁丝在氧气中燃烧'], ['2Mg + O₂ → 2MgO', '镁条燃烧'],
  ]},
  { title: '分解反应', rows: [
    ['2H₂O₂ → 2H₂O + O₂↑（MnO₂）', '过氧化氢制氧气'],
    ['2KMnO₄ → K₂MnO₄ + MnO₂ + O₂↑（加热）', '高锰酸钾制氧气'],
    ['CaCO₃ → CaO + CO₂↑（高温）', '碳酸钙分解'],
  ]},
  { title: '置换与复分解', rows: [
    ['Zn + 2HCl → ZnCl₂ + H₂↑', '锌与盐酸'], ['Fe + CuSO₄ → FeSO₄ + Cu', '铁置换铜'],
    ['HCl + NaOH → NaCl + H₂O', '酸碱中和'], ['Ca(OH)₂ + CO₂ → CaCO₃↓ + H₂O', '检验二氧化碳'],
  ]},
];

function SymbolGrid({ items }: { items: string[][] }) {
  return <div className="chem-symbol-grid">{items.map(([symbol, name]) => (
    <div className="chem-symbol" key={symbol}>
      <strong>{symbol}</strong><span>{name}</span>
    </div>
  ))}</div>;
}

export default function ChemistryLanguagePage() {
  return (
    <>
      <PageHeader
        title="化学用语大全"
        sub="初中常用元素、离子、化合价、化学式与方程式速查"
        extra={<Link to="/subjects"><Button size="small" icon={<ArrowLeft size={16} />}>返回学科中心</Button></Link>}
      />
      <div className="page-body chem-page">
        <nav className="chem-nav" aria-label="页面目录">
          <a href="#elements">元素与离子</a><a href="#valence">化合价</a><a href="#formula">化学式</a><a href="#equations">方程式</a>
        </nav>

        <Card className="chem-card" id="elements">
          <Title size="small" color="app-green">⚛️ 常用元素符号</Title>
          <SymbolGrid items={ELEMENTS} />
          <Title size="small" color="app-yellow">🔋 常见离子</Title>
          <SymbolGrid items={IONS} />
        </Card>

        <Card color="app-yellow" className="chem-card" id="valence">
          <Title size="small" color="app-yellow">🎵 常见化合价口诀</Title>
          <div className="chem-rhyme">一价钾钠氯氢银，二价氧钙钡镁锌；三铝四硅五价磷，二三铁、二四碳；二四六硫都齐全，铜汞二价最常见。</div>
          <div className="chem-notes">
            <Tag color="app-green">单质中元素化合价为 0</Tag>
            <Tag color="app-yellow">化合物中正负化合价代数和为 0</Tag>
            <Tag color="purple">原子团化合价等于所带电荷数</Tag>
          </div>
        </Card>

        <Card className="chem-card" id="formula">
          <Title size="small" color="app-green">✍️ 化学式书写规则</Title>
          <ol className="chem-steps">
            <li><strong>正价在前，负价在后：</strong>金属或铵根通常写左边，非金属或酸根写右边。</li>
            <li><strong>交叉约简：</strong>将化合价绝对值交叉写为右下角数字，并约成最简整数比。</li>
            <li><strong>原子团要加括号：</strong>原子团个数大于 1 时加括号，如 Ca(OH)₂、Al₂(SO₄)₃。</li>
          </ol>
          <div className="chem-example-row">
            {['NaCl', 'MgCl₂', 'Al₂O₃', 'Ca(OH)₂', 'Al₂(SO₄)₃', 'NH₄NO₃'].map((item) => <code key={item}>{item}</code>)}
          </div>
          <Title size="small" color="app-green">🧪 常见物质</Title>
          <SymbolGrid items={SUBSTANCES} />
        </Card>

        <Card className="chem-card" id="equations">
          <Title size="small" color="app-green">⚖️ 常用化学方程式</Title>
          <div className="chem-equation-groups">
            {EQUATION_GROUPS.map((group) => (
              <section key={group.title} className="chem-equation-group">
                <h3>{group.title}</h3>
                {group.rows.map(([formula, desc]) => <div className="chem-equation" key={formula}><strong>{formula}</strong><span>{desc}</span></div>)}
              </section>
            ))}
          </div>
          <div className="chem-legend"><span><b>↑</b> 生成气体</span><span><b>↓</b> 生成沉淀</span><span><b>加热</b> 反应条件</span><span><b>MnO₂</b> 催化剂</span></div>
        </Card>

        <Card color="brown" className="chem-check">
          <Title size="small" color="app-yellow">✅ 方程式检查四步</Title>
          <span>化学式正确</span><span>配平系数最简</span><span>条件完整</span><span>气体与沉淀符号正确</span>
        </Card>
      </div>
    </>
  );
}
