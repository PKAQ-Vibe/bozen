// 元素周期表 · 唯一整表页
// 标准 18 族 × 7 周期 · 镧系锕系单独下方 · 顶部族列头 + 左侧周期号 + 类别 Legend
// 氢到氩重点标识 · 底部保留前 20 号谐音口诀折叠区

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Divider, Tag, Title } from 'animal-island-ui';
import { ArrowLeft } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import ToastModal from '@/components/modals/ToastModal';
import { linkComplete } from '@/services';
import elementsData from '@data/elements.json';
import './PeriodicTable.css';

interface Element {
  z: number;
  sym: string;
  name: string;
  period: number;
  group: number; // 0 = 镧锕系（单独放）
  cat: string;
  mnemonic?: string;
}
const ALL = elementsData as Element[];

const CAT_LABEL: Record<string, string> = {
  'alkali': '碱金属 (IA)',
  'alkaline': '碱土金属 (IIA)',
  'transition': '过渡金属',
  'post-transition': '主族金属',
  'metalloid': '类金属',
  'nonmetal': '非金属（固）',
  'nonmetal-gas': '非金属（气）',
  'halogen': '卤素 (VIIA)',
  'noble': '惰性气体 (0)',
  'lanthanide': '镧系',
  'actinide': '锕系',
};

const CAT_COLOR: Record<string, string> = {
  'alkali': '#ffc99b',
  'alkaline': '#ffde9b',
  'transition': '#e3cad4',
  'post-transition': '#d3d0e0',
  'metalloid': '#e6dcbe',
  'nonmetal': '#ceecc4',
  'nonmetal-gas': '#dceeff',
  'halogen': '#ffdfb1',
  'noble': '#f5c9df',
  'lanthanide': '#f3d7b6',
  'actinide': '#c3ddf5',
};

// 中文族名（初中重点）
const GROUP_LABEL: Record<number, string> = {
  1: 'IA', 2: 'IIA', 3: 'IIIB', 4: 'IVB', 5: 'VB', 6: 'VIB', 7: 'VIIB',
  8: 'VIII', 9: 'VIII', 10: 'VIII',
  11: 'IB', 12: 'IIB',
  13: 'IIIA', 14: 'IVA', 15: 'VA', 16: 'VIA', 17: 'VIIA', 18: '0',
};

const CHUNK_RHYMES: { title: string; text: string; hint: string }[] = [
  { title: '第 1 组 · 氢氦锂铍硼', text: '青海里皮捧', hint: '⚽ 名帅里皮捧杯' },
  { title: '第 2 组 · 碳氮氧氟氖', text: '探蛋养父奶', hint: '一家五口探望' },
  { title: '第 3 组 · 钠镁铝硅磷', text: '娜美旅归林', hint: '☠️ 海贼王娜美' },
  { title: '第 4 组 · 硫氯氩钾钙', text: '留绿鸭加盖', hint: '💧 别让鸭子跑了' },
];

export default function PeriodicTablePage() {
  const [toast, setToast] = useState<string | null>(null);
  const [showMnemonic, setShowMnemonic] = useState(false);

  // 按 period-group 建索引
  const byKey = useMemo(() => {
    const m: Record<string, Element> = {};
    for (const e of ALL) {
      if (e.group === 0) continue;
      m[`${e.period}-${e.group}`] = e;
    }
    return m;
  }, []);

  const lanthanides = useMemo(
    () => ALL.filter((e) => e.cat === 'lanthanide').sort((a, b) => a.z - b.z),
    [],
  );
  const actinides = useMemo(
    () => ALL.filter((e) => e.cat === 'actinide').sort((a, b) => a.z - b.z),
    [],
  );

  // 主表：7 周期 × 18 族
  const rows = Array.from({ length: 7 }, (_, p) =>
    Array.from({ length: 18 }, (_, g) => byKey[`${p + 1}-${g + 1}`] ?? null),
  );

  function passAllRhymes() {
    const r = linkComplete('periodic.stage1.pass', {
      actualSeconds: 20 * 60,
      note: '元素周期表前 20 号背诵完成',
    });
    setToast(r.updatedIds.length > 0
      ? `✅ 已联动打卡：${r.taskTitles.join('、')}`
      : '✅ 通关！本次未匹配到今日任务');
  }

  return (
    <>
      <PageHeader
        title="元素周期表"
        sub="标准 18 族 × 7 周期 · 氢到氩重点标识 · 惰性气体独立标注"
        extra={
          <Link to="/subjects"><Button size="small" icon={<ArrowLeft size={13} />}>返回学科中心</Button></Link>
        }
      />
      <div className="page-body pt-page">
        {/* 图例 */}
        <Card className="pt-legend">
          <Title size="small" color="app-green">🎨 元素类别图例</Title>
          <div className="pt-legend__grid">
            {Object.entries(CAT_LABEL).map(([k, label]) => (
              <span key={k} className="pt-legend__item">
                <span className="pt-legend__swatch" style={{ background: CAT_COLOR[k] }} />
                {label}
              </span>
            ))}
            <span className="pt-legend__item">
              <span className="pt-legend__swatch pt-legend__swatch--must" />
              氢到氩（重点）
            </span>
          </div>
        </Card>

        {/* 主表 */}
        <Card className="pt-table">
          <div className="pt-scroll">
            {/* 顶部族列头 */}
            <div className="pt-group-row">
              <span className="pt-corner" />
              {Array.from({ length: 18 }, (_, i) => {
                const g = i + 1;
                return (
                  <span key={g} className={`pt-group-cell ${g === 18 ? 'pt-group-cell--noble' : ''}`}>
                    <span className="pt-group-cell__num">{g}</span>
                    <span className="pt-group-cell__code">{GROUP_LABEL[g]}</span>
                  </span>
                );
              })}
            </div>

            {/* 7 个周期 */}
            {rows.map((row, p) => (
              <div key={p} className={`pt-period-row ${p < 3 ? 'pt-period-row--core' : ''} ${p === 0 ? 'pt-period-row--core-first' : ''} ${p === 2 ? 'pt-period-row--core-last' : ''}`}>
                <span className="pt-period-num">{p + 1}</span>
                {row.map((el, g) => (
                  <div
                    key={g}
                    className={`pt-cell ${el ? 'pt-cell--fill' : 'pt-cell--empty'} ${el && el.z <= 18 ? 'pt-cell--must' : ''} ${g + 1 === 18 && el ? 'pt-cell--noble' : ''}`}
                    style={el ? { background: CAT_COLOR[el.cat] } : undefined}
                    title={el ? `${el.z} · ${el.sym} · ${el.name} · ${CAT_LABEL[el.cat] ?? ''}` : ''}
                  >
                    {el && (
                      <>
                        <span className="pt-cell__z">{el.z}</span>
                        <span className="pt-cell__sym">{el.sym}</span>
                        <span className="pt-cell__name">{el.name}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ))}

            {/* 镧系/锕系单列 */}
            <div className="pt-inner-block">
              <div className="pt-period-row pt-inner-row">
                <span className="pt-period-num pt-period-num--lan">La-Lu</span>
                {lanthanides.map((el) => (
                  <div
                    key={el.z}
                    className="pt-cell pt-cell--fill"
                    style={{ background: CAT_COLOR[el.cat] }}
                    title={`${el.z} · ${el.sym} · ${el.name} · 镧系`}
                  >
                    <span className="pt-cell__z">{el.z}</span>
                    <span className="pt-cell__sym">{el.sym}</span>
                    <span className="pt-cell__name">{el.name}</span>
                  </div>
                ))}
              </div>
              <div className="pt-period-row pt-inner-row">
                <span className="pt-period-num pt-period-num--lan">Ac-Lr</span>
                {actinides.map((el) => (
                  <div
                    key={el.z}
                    className="pt-cell pt-cell--fill"
                    style={{ background: CAT_COLOR[el.cat] }}
                    title={`${el.z} · ${el.sym} · ${el.name} · 锕系`}
                  >
                    <span className="pt-cell__z">{el.z}</span>
                    <span className="pt-cell__sym">{el.sym}</span>
                    <span className="pt-cell__name">{el.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* 谐音口诀 · 前 20 号 */}
        <Card color="app-yellow" className="pt-mnemonic-wrap">
          <div className="pt-mnemonic-head">
            <Title size="small" color="app-yellow">🎵 前 20 号谐音口诀</Title>
            <div className="pt-mnemonic-spacer" />
            <Button size="small" onClick={() => setShowMnemonic((v) => !v)}>
              {showMnemonic ? '收起' : '展开'}
            </Button>
          </div>
          {showMnemonic && (
            <>
              <Divider type="dashed-brown" />
              <div className="pt-rhyme-grid">
                {CHUNK_RHYMES.map((r, i) => (
                  <Card key={i} className="pt-rhyme-card">
                    <div className="pt-rhyme-title">{r.title}</div>
                    <div className="pt-rhyme-text">{r.text}</div>
                    <div className="pt-rhyme-hint">{r.hint}</div>
                  </Card>
                ))}
              </div>
              <div className="pt-tag-list">
                {ALL.filter((e) => e.z <= 20 && e.mnemonic).map((e) => (
                  <Tag key={e.z} size="small" color="app-yellow">
                    {e.sym} {e.name} · {e.mnemonic}
                  </Tag>
                ))}
              </div>
              <div className="pt-pass-wrap">
                <Button type="primary" size="middle" onClick={passAllRhymes}>
                  ✓ 提交前 20 号背诵完成
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>

      <ToastModal open={toast !== null} message={toast ?? ''} onClose={() => setToast(null)} />
    </>
  );
}
