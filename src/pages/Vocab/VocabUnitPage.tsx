// 单词单元汇总表页 · 隐英/隐中切换 · 底部开始卡片背诵

import { useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Switch, Tag, Title } from 'animal-island-ui';
import { ArrowLeft, ExternalLink, Play, Search } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { getAllProgress, getUnit, getUnitStats } from '@/services';
import { isDueToday } from '@/models';
import { splitWord } from './morphology';
import './VocabPage.css';

export default function VocabUnitPage() {
  const { unitId = '' } = useParams();
  const navigate = useNavigate();
  const unit = useMemo(() => getUnit(unitId), [unitId]);
  const stats = useMemo(() => getUnitStats(unitId), [unitId]);
  const progress = useMemo(() => getAllProgress(), [unitId]);

  const [hideEn, setHideEn] = useState(false);
  const [hideZh, setHideZh] = useState(false);
  const [query, setQuery] = useState('');
  const [countChoice, setCountChoice] = useState<number>(0); // 0 = 今日 due 全部
  const [customCount, setCustomCount] = useState('');

  if (!unit) {
    return (
      <>
        <PageHeader title="单元不存在" sub="" />
        <div className="page-body" style={{ padding: 40, textAlign: 'center' }}>
          <Link to="/subjects"><Button icon={<ArrowLeft size={13} />}>返回学科中心</Button></Link>
        </div>
      </>
    );
  }

  const filteredWords = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return unit.words;
    return unit.words.filter(
      (w) => w.en.toLowerCase().includes(q) || w.zh.includes(query),
    );
  }, [unit.words, query]);

  return (
    <>
      <PageHeader
        title={`${unit.no} · ${unit.title}`}
        sub={`共 ${unit.words.length} 词 · 新 ${stats.fresh} · 复习 ${stats.reviewing} · 毕业 ${stats.graduated}`}
        extra={
          <>
            <Link to="/subjects"><Button size="small" icon={<ArrowLeft size={13} />}>返回学科中心</Button></Link>
          </>
        }
      />
      <div className="page-body vocab-unit-page">
        <Card className="vocab-toolbar">
          <div className="vocab-toolbar__row">
            <div className="vocab-toolbar__switch">
              <span>隐藏英文</span>
              <Switch checked={hideEn} onChange={setHideEn} />
            </div>
            <div className="vocab-toolbar__switch">
              <span>隐藏中文</span>
              <Switch checked={hideZh} onChange={setHideZh} />
            </div>
            <div className="vocab-toolbar__spacer" />
            <div className="vocab-toolbar__search">
              <Search size={14} color="var(--c-muted)" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索词条..."
              />
            </div>
          </div>
          <div className="vocab-toolbar__hint">
            💡 隐藏英文 → 自测中文能否想起英文；隐藏中文 → 自测英文能否想起中文
          </div>
        </Card>

        {unit.words.length === 0 ? (
          <Card type="dashed" className="vocab-empty">
            这个单元还没有单词 · 请家长在 <Link to="/parent">管理端 → 📖 词表管理</Link> 补入
          </Card>
        ) : (
          <>
            <Card className="vocab-legend">
              <Title size="small" color="app-green">🎯 状态说明</Title>
              <div className="vocab-legend__rows">
                <div><Tag size="small" color="default">✨ 新</Tag> — 从未背过</div>
                <div><Tag size="small" color="app-orange">📅 今日复背</Tag> — 到期需要复习</div>
                <div><Tag size="small" color="app-green">R3 · R4 · R5</Tag> — 复习中的轮次</div>
                <div><Tag size="small" color="lime-green">🎓 毕业</Tag> — 长期记忆已建立</div>
              </div>
            </Card>

            <Card className="vocab-list-card">
              <div className="vocab-list-head">
                <span className="vocab-list-col vocab-list-col--num">#</span>
                <span className="vocab-list-col vocab-list-col--en">英文</span>
                <span className="vocab-list-col vocab-list-col--pos">词性</span>
                <span className="vocab-list-col vocab-list-col--zh">中文</span>
                <span className="vocab-list-col vocab-list-col--st">状态</span>
              </div>
              {filteredWords.map((w, i) => {
                const p = progress[w.id] ?? { wordId: w.id, round: 0, correctCount: 0, wrongCount: 0 };
                const due = isDueToday(p);
                let stateTag;
                if (p.round >= 6) stateTag = <Tag size="small" color="lime-green">🎓 毕业</Tag>;
                else if (p.round === 0) stateTag = <Tag size="small" color="default">✨ 新</Tag>;
                else stateTag = <Tag size="small" color={due ? 'app-orange' : 'app-green'}>
                  {due ? `📅 R${p.round}·今日复背` : `R${p.round}`}
                </Tag>;
                return (
                  <div key={w.id} className="vocab-list-row">
                    <span className="vocab-list-col vocab-list-col--num">{i + 1}</span>
                    <span className={`vocab-list-col vocab-list-col--en ${hideEn ? 'is-blur' : ''}`}>
                      {hideEn ? '···' : splitWord(w.en).map((p, k) => (
                        <span key={k} className={`vocab-part vocab-part--${p.kind}`}>{p.text}</span>
                      ))}
                    </span>
                    <span className="vocab-list-col vocab-list-col--pos">{w.pos ?? ''}</span>
                    <span className={`vocab-list-col vocab-list-col--zh ${hideZh ? 'is-blur' : ''}`}>
                      {hideZh ? '···' : w.zh}
                    </span>
                    <span className="vocab-list-col vocab-list-col--st">{stateTag}</span>
                  </div>
                );
              })}
              {filteredWords.length === 0 && (
                <div className="vocab-list-empty">没有匹配的词条</div>
              )}
            </Card>

            <Card className="vocab-count-picker">
              <div className="vocab-count-picker__label">🎯 今日背诵数量</div>
              <div className="vocab-count-picker__row">
                {[0, 10, 15, 20].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`vocab-count-chip ${countChoice === n && !customCount ? 'is-active' : ''}`}
                    onClick={() => { setCountChoice(n); setCustomCount(''); }}
                  >
                    {n === 0 ? '今日 due 全部' : `${n} 词`}
                  </button>
                ))}
                <span style={{ fontSize: 16, color: 'var(--c-muted)' }}>或自定义</span>
                <input
                  type="number"
                  min={1}
                  max={200}
                  className="vocab-count-picker__custom"
                  placeholder="N"
                  value={customCount}
                  onChange={(e) => { setCustomCount(e.target.value); setCountChoice(-1); }}
                />
              </div>
            </Card>

            <div className="vocab-unit-actions">
              <Button
                size="large"
                onClick={() => {
                  const n = customCount ? Number(customCount) : countChoice;
                  const params = new URLSearchParams();
                  params.set('mode', 'study');
                  if (n > 0) params.set('count', String(n));
                  navigate(`/vocab/${unitId}/drill?${params}`);
                }}
              >
                📚 学习模式（首次熟悉）
              </Button>
              <Button
                type="primary"
                size="large"
                icon={<Play size={16} />}
                onClick={() => {
                  const n = customCount ? Number(customCount) : countChoice;
                  const params = new URLSearchParams();
                  params.set('mode', 'quiz');
                  if (n > 0) params.set('count', String(n));
                  navigate(`/vocab/${unitId}/drill?${params}`);
                }}
              >
                🎯 背诵模式（考核）
              </Button>
              <a
                href="https://www.ncego.com/"
                target="_blank"
                rel="noreferrer"
                className="vocab-unit-video-btn"
              >
                <Button size="large" icon={<ExternalLink size={14} />}>
                  极速英语·同步视频
                </Button>
              </a>
            </div>

          </>
        )}
      </div>
    </>
  );
}
