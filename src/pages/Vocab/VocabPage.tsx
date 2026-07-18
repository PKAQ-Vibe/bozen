// 词汇背诵入口页 · 单元卡片总览
// 点击进入某单元 → 卡片式复背流程

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Tabs, Tag, Title } from 'animal-island-ui';
import type { TabItem } from 'animal-island-ui';
import { ArrowRight, BookOpen, GraduationCap, Sparkles } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import {
  getAllUnits,
  getDueToday,
  getUnitStats,
} from '@/services';
import type { VocabUnit } from '@/models';
import './VocabPage.css';

export default function VocabPage() {
  const units = useMemo(() => getAllUnits(), []);
  const totalDue = useMemo(() => getDueToday().length, []);

  const items: TabItem[] = [
    { key: 'all', label: '全部单元', children: <UnitList units={units} /> },
    { key: 'due', label: `今日 due (${totalDue})`, children: <DueList /> },
    { key: 'howto', label: '记忆曲线说明', children: <HowTo /> },
  ];

  return (
    <>
      <PageHeader
        title="英语单词背诵"
        sub="艾宾浩斯记忆曲线 · 新词学一遍 → D1/D2/D4/D7/D14/D30 复背"
        extra={
          <>
            {totalDue > 0 && <Tag color="app-orange" size="small">今日 due {totalDue} 个</Tag>}
            <Link to="/resources">
              <Button size="small" icon={<BookOpen size={13} />}>课本 PDF</Button>
            </Link>
          </>
        }
      />
      <div className="page-body vocab-page">
        <Tabs items={items} defaultActiveKey={totalDue > 0 ? 'due' : 'all'} leafAnimation={false} />
      </div>
    </>
  );
}

function UnitList({ units }: { units: VocabUnit[] }) {
  return (
    <div className="vocab-unit-grid">
      {units.map((u) => {
        const s = getUnitStats(u.id);
        const empty = s.total === 0;
        return (
          <Card key={u.id} color={empty ? 'default' : s.dueToday > 0 ? 'app-yellow' : 'lime-green'} className="vocab-unit-card">
            <div className="vocab-unit-card__head">
              <span className="vocab-unit-card__no">{u.no}</span>
              <Tag size="small" color={empty ? 'default' : 'app-green'}>
                {empty ? '待补词' : `${s.total} 词`}
              </Tag>
            </div>
            <div className="vocab-unit-card__title">{u.title}</div>
            {!empty && (
              <div className="vocab-unit-card__stats">
                <span><Sparkles size={11} /> 新 {s.fresh}</span>
                <span>🔁 复习 {s.reviewing}</span>
                <span><GraduationCap size={11} /> 毕业 {s.graduated}</span>
              </div>
            )}
            <div className="vocab-unit-card__actions">
              {empty ? (
                <span className="vocab-unit-card__hint">在家长端「📖 词表管理」补入单词</span>
              ) : (
                <Link to={`/vocab/${u.id}`}>
                  <Button
                    type="primary"
                    size="small"
                    icon={<ArrowRight size={12} />}
                  >
                    {s.dueToday > 0 ? `背 ${s.dueToday} 个` : '复习'}
                  </Button>
                </Link>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function DueList() {
  const dueWords = useMemo(() => getDueToday(), []);
  const byUnit = useMemo(() => {
    const units = getAllUnits();
    const map: { unit: VocabUnit; count: number }[] = [];
    for (const u of units) {
      const c = u.words.filter((w) => dueWords.some((d) => d.id === w.id)).length;
      if (c > 0) map.push({ unit: u, count: c });
    }
    return map;
  }, [dueWords]);

  if (dueWords.length === 0) {
    return (
      <Card type="dashed" className="vocab-empty">
        今天没有需要复背的单词 🎉 · 找一个 fresh 单元开背吧
      </Card>
    );
  }

  return (
    <div className="vocab-due">
      <Card color="app-yellow">
        <Title size="small" color="app-yellow">今日 {dueWords.length} 词到期</Title>
        <div className="vocab-due__desc">
          按单元分批 · 每单元一次专注段（15-20 分钟），按记忆曲线自动排下一次
        </div>
      </Card>
      {byUnit.map(({ unit, count }) => (
        <Card key={unit.id} className="vocab-due-row">
          <span className="vocab-due-row__no">{unit.no}</span>
          <span className="vocab-due-row__title">{unit.title}</span>
          <Tag size="small" color="app-orange">{count} 词 due</Tag>
          <Link to={`/vocab/${unit.id}`}>
            <Button size="small" type="primary" icon={<ArrowRight size={12} />}>去背</Button>
          </Link>
        </Card>
      ))}
    </div>
  );
}

function HowTo() {
  return (
    <Card className="vocab-howto">
      <Title size="small" color="app-green">📚 记忆曲线复背原理</Title>
      <p>每背完一个词，系统按下表安排下一次「到期」：</p>
      <table className="vocab-howto__table">
        <thead>
          <tr>
            <th>轮次</th><th>间隔</th><th>状态</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Round 0</td><td>新词，永远 due</td><td>fresh</td></tr>
          <tr><td>Round 1</td><td>1 天后</td><td>reviewing</td></tr>
          <tr><td>Round 2</td><td>2 天后</td><td>reviewing</td></tr>
          <tr><td>Round 3</td><td>4 天后</td><td>reviewing</td></tr>
          <tr><td>Round 4</td><td>7 天后</td><td>reviewing</td></tr>
          <tr><td>Round 5</td><td>14 天后</td><td>reviewing</td></tr>
          <tr><td>Round 6</td><td>30 天后 → 毕业</td><td>graduated 🎓</td></tr>
        </tbody>
      </table>
      <p style={{ marginTop: 12 }}>
        <strong>背错 → round 回退一步</strong>，重新加深；正确 → 前进到下一轮。
        <br />每个单词毕业时代表长期记忆已建立。
      </p>
    </Card>
  );
}
