// 单元背诵/学习页 · 支持 ?mode=学习|背诵 · ?filter=due|all|fresh · ?count=N
// 背诵模式：显示英文 → 翻面对答案 → 会 / 不会
// 学习模式：英+中+例句一起展示，纯浏览 → 下一个
// 卡片进入自动发音 · 词根词缀高亮

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button, Card, Tag, Title } from 'animal-island-ui';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Volume2, X } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import {
  getAllProgress,
  getUnit,
  getUnitStats,
  linkComplete,
  recordReview,
} from '@/services';
import { REVIEW_INTERVALS, isDueToday } from '@/models';
import { splitWord } from './morphology';
import './VocabPage.css';

type FilterMode = 'due' | 'all' | 'fresh';
type LearnMode = 'study' | 'quiz';
type AccentMode = 'us' | 'uk';

const ACCENT_LANG: Record<AccentMode, string> = {
  us: 'en-US',
  uk: 'en-GB',
};

function speak(text: string, accent: AccentMode) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = ACCENT_LANG[accent];
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

export default function VocabDrillPage() {
  const { unitId = '' } = useParams();
  const [params] = useSearchParams();
  const filterParam = (params.get('filter') as FilterMode) || 'due';
  const learnModeParam = (params.get('mode') as LearnMode) || 'quiz';
  const countParam = Number(params.get('count')) || 0;
  const unit = useMemo(() => getUnit(unitId), [unitId]);
  const navigate = useNavigate();
  const [mode] = useState<FilterMode>(filterParam);
  const [learnMode, setLearnMode] = useState<LearnMode>(learnModeParam);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [accent, setAccent] = useState<AccentMode>('us');

  // 队列在进入页面时一次性锁定；学习+背诵模式都默认取全单元，避免"再次进入没词可背"
  const queue = useMemo(() => {
    if (!unit) return [];
    const progress = getAllProgress();
    let list;
    if (mode === 'fresh') list = unit.words.filter((w) => (progress[w.id]?.round ?? 0) === 0);
    else if (mode === 'due') list = unit.words.filter((w) => {
      const p = progress[w.id] ?? { wordId: w.id, round: 0, correctCount: 0, wrongCount: 0 };
      return isDueToday(p);
    });
    else list = unit.words; // 默认 all
    // 空 due 兜底：如果按 due 过滤后为空，退回到全单元让"再次进入"也有词可背
    if (list.length === 0) list = unit.words;
    if (countParam > 0) list = list.slice(0, countParam);
    return list;
  }, [unit, mode, countParam]);

  // 背诵模式：给每个词随机方向（EN→ZH 或 ZH→EN），学习模式直接同框显示
  const directions = useMemo(() => {
    return queue.map((_, i) => (i % 2 === 0 ? 'en2zh' : 'zh2en') as 'en2zh' | 'zh2en');
  }, [queue]);

  if (!unit) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p>没有找到该单元</p>
        <Link to="/vocab"><Button>返回</Button></Link>
      </div>
    );
  }

  if (unit.words.length === 0) {
    return (
      <>
        <PageHeader title={`${unit.no} · ${unit.title}`} sub="待补充单词" />
        <div className="page-body">
          <Card type="dashed" style={{ padding: 40, textAlign: 'center' }}>
            此单元还没有单词 · 请家长在 <Link to="/parent">管理端 → 📖 词表管理</Link> 补入
          </Card>
        </div>
      </>
    );
  }

  if (queue.length === 0) {
    return (
      <>
        <PageHeader title={`${unit.no} · ${unit.title}`} sub={mode === 'due' ? '今日没有 due 单词' : '空'} />
        <div className="page-body">
          <Card color="lime-green" style={{ padding: 24, textAlign: 'center' }}>
            🎉 这个单元今天没有需要复背的单词。<br />
            <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
              <Link to="/vocab"><Button>返回单元列表</Button></Link>
              <Link to={`/vocab/${unitId}?mode=all`}><Button type="primary">全部再学一遍</Button></Link>
            </div>
          </Card>
        </div>
      </>
    );
  }

  const cur = queue[idx];

  // 卡片进入自动发音（zh2en 方向不自动读英文，保留悬念）
  useEffect(() => {
    if (!cur || flipped) return;
    const dir = directions[idx] ?? 'en2zh';
    if (learnMode === 'study' || dir === 'en2zh') speak(cur.en, accent);
  }, [cur?.id, accent]); // 词条切换或口音切换时触发

  // 清理：离开页面停止语音
  useEffect(() => () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
  }, []);

  const enParts = useMemo(() => (cur ? splitWord(cur.en) : []), [cur?.id]);

  function answer(correct: boolean) {
    const next = recordReview(cur.id, correct);
    if (correct) setCorrectCount((n) => n + 1);
    else setWrongCount((n) => n + 1);
    const nextDay = next.dueAt ? new Date(next.dueAt) : null;
    setFlipped(false);
    if (idx + 1 >= queue.length) {
      setDone(true);
      // 联动打卡：整轮完成 → 找今日对应任务转 awaiting_review
      try {
        linkComplete(`vocab.unit.${unitId}`, {
          actualSeconds: queue.length * 20,
          note: `背了 ${queue.length} 个词 · 正确率 ${Math.round(((correctCount + (correct ? 1 : 0)) / queue.length) * 100)}%`,
        });
      } catch (e) { void e; }
    } else {
      setIdx((i) => i + 1);
    }
    void nextDay;
  }

  function moveWord(offset: -1 | 1) {
    setIdx((current) => Math.min(queue.length - 1, Math.max(0, current + offset)));
    setFlipped(false);
  }

  const stats = getUnitStats(unitId);

  if (done) {
    return (
      <>
        <PageHeader
          title={`${unit.no} · 已完成一轮`}
          sub={`背对 ${correctCount} · 需再练 ${wrongCount}`}
        />
        <div className="page-body" style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Card style={{ maxWidth: 480, width: '100%', textAlign: 'center', padding: 24 }}>
            <div style={{ fontSize: 42 }}>🎉</div>
            <Title size="middle" color="app-green">今日任务完成！</Title>
            <div style={{ margin: '16px 0', fontSize: 16, color: 'var(--c-mid)' }}>
              本轮共背 <strong>{queue.length}</strong> 个单词 · 背对率 {Math.round((correctCount / queue.length) * 100)}%<br />
              下次复背按记忆曲线自动排到 D1/D2/D4/D7/D14/D30
            </div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', margin: '16px 0' }}>
              <Tag color="lime-green" size="small">🎓 已毕业 {stats.graduated}</Tag>
              <Tag color="app-yellow" size="small">🔁 复习中 {stats.reviewing}</Tag>
              <Tag color="default" size="small">✨ 新词 {stats.fresh}</Tag>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <Button onClick={() => navigate(`/vocab/${unitId}`)}>返回单元</Button>
              <Button type="primary" onClick={() => { setDone(false); setIdx(0); setCorrectCount(0); setWrongCount(0); }}>再来一轮</Button>
            </div>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`${unit.no} · ${unit.title}`}
        sub={learnMode === 'study'
          ? `📚 学习模式 · 第 ${idx + 1} / ${queue.length} 词`
          : `🎯 背诵模式 · 第 ${idx + 1} / ${queue.length} · 背对 ${correctCount} · 错 ${wrongCount}`}
        extra={
          <>
            <div className="vocab-mode-switch">
              <button
                type="button"
                className={`vocab-mode-btn ${learnMode === 'study' ? 'is-active' : ''}`}
                onClick={() => { setLearnMode('study'); setFlipped(false); }}
              >📚 学习</button>
              <button
                type="button"
                className={`vocab-mode-btn ${learnMode === 'quiz' ? 'is-active' : ''}`}
                onClick={() => { setLearnMode('quiz'); setFlipped(false); }}
              >🎯 背诵</button>
            </div>
            <div className="vocab-accent-switch" aria-label="发音口音">
              <button
                type="button"
                className={`vocab-accent-btn ${accent === 'us' ? 'is-active' : ''}`}
                onClick={() => setAccent('us')}
              >美式</button>
              <button
                type="button"
                className={`vocab-accent-btn ${accent === 'uk' ? 'is-active' : ''}`}
                onClick={() => setAccent('uk')}
              >英式</button>
            </div>
            <Link to={`/vocab/${unitId}`}><Button size="small" icon={<ArrowLeft size={13} />}>返回单元</Button></Link>
          </>
        }
      />
      <div className="page-body vocab-drill">
        <div className="vocab-drill__progress">
          <div style={{ width: `${((idx + (flipped ? 0.5 : 0)) / queue.length) * 100}%` }} />
        </div>

        <div className="vocab-drill__card-wrap">
          {learnMode === 'study' ? (
            <div className="vocab-drill__card vocab-drill__card--study">
              <div className="vocab-drill__en">
                {enParts.map((p, i) => (
                  <span key={i} className={`vocab-part vocab-part--${p.kind}`}>{p.text}</span>
                ))}
              </div>
              {cur.pos && <div className="vocab-drill__pos">{cur.pos}</div>}
              <div className="vocab-drill__zh">{cur.zh}</div>
              {cur.example && <div className="vocab-drill__example">"{cur.example}"</div>}
              <button
                type="button"
                className="vocab-drill__speak"
                onClick={() => speak(cur.en, accent)}
                title="重听"
              >
                <Volume2 size={18} /> 重听发音
              </button>
            </div>
          ) : (() => {
            const dir = directions[idx] ?? 'en2zh';
            const showEnFirst = dir === 'en2zh';
            return (
            <button
              type="button"
              className={`vocab-drill__card ${flipped ? 'vocab-drill__card--flipped' : ''}`}
              onClick={() => setFlipped((f) => !f)}
            >
              <div className="vocab-drill__dir-tag">
                {showEnFirst ? '👀 看英文 · 猜中文' : '🀄 看中文 · 猜英文'}
              </div>
              {!flipped ? (
                <>
                  <div className="vocab-drill__hint">点击卡片翻面</div>
                  {showEnFirst ? (
                    <>
                      <div className="vocab-drill__en">
                        {enParts.map((p, i) => (
                          <span key={i} className={`vocab-part vocab-part--${p.kind}`}>{p.text}</span>
                        ))}
                      </div>
                      {cur.pos && <div className="vocab-drill__pos">{cur.pos}</div>}
                      <button
                        type="button"
                        className="vocab-drill__speak"
                        onClick={(e) => { e.stopPropagation(); speak(cur.en, accent); }}
                        title="重听"
                      >
                        <Volume2 size={18} /> 重听
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="vocab-drill__zh">{cur.zh}</div>
                      {cur.pos && <div className="vocab-drill__pos">{cur.pos}</div>}
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className="vocab-drill__hint">点击卡片翻回</div>
                  {showEnFirst ? (
                    <>
                      <div className="vocab-drill__zh">{cur.zh}</div>
                      {cur.pos && <div className="vocab-drill__pos">{cur.pos}</div>}
                      {cur.example && <div className="vocab-drill__example">"{cur.example}"</div>}
                    </>
                  ) : (
                    <>
                      <div className="vocab-drill__en">
                        {enParts.map((p, i) => (
                          <span key={i} className={`vocab-part vocab-part--${p.kind}`}>{p.text}</span>
                        ))}
                      </div>
                      {cur.pos && <div className="vocab-drill__pos">{cur.pos}</div>}
                      {cur.example && <div className="vocab-drill__example">"{cur.example}"</div>}
                    </>
                  )}
                  <button
                    type="button"
                    className="vocab-drill__speak"
                    onClick={(e) => { e.stopPropagation(); speak(cur.en, accent); }}
                    title="重听英文"
                  >
                    <Volume2 size={18} /> 再听英文
                  </button>
                </>
              )}
            </button>
            );
          })()}
        </div>

        <div className="vocab-drill__actions">
          {learnMode === 'study' ? (
            <>
              <Button
                block
                size="large"
                disabled={idx === 0}
                onClick={() => setIdx((i) => Math.max(0, i - 1))}
              >
                ← 上一个
              </Button>
              <Button
                block
                type="primary"
                size="large"
                icon={<ChevronRight size={16} />}
                onClick={() => {
                  if (idx + 1 >= queue.length) setDone(true);
                  else setIdx((i) => i + 1);
                }}
              >
                {idx + 1 >= queue.length ? '完成学习' : '下一个 →'}
              </Button>
            </>
          ) : (
            <>
              <div className="vocab-drill__nav">
                <Button
                  block
                  size="large"
                  icon={<ChevronLeft size={16} />}
                  disabled={idx === 0}
                  onClick={() => moveWord(-1)}
                >
                  上一个
                </Button>
                <Button
                  block
                  size="large"
                  icon={<ChevronRight size={16} />}
                  disabled={idx + 1 >= queue.length}
                  onClick={() => moveWord(1)}
                >
                  下一个
                </Button>
              </div>
              {!flipped ? (
                <Button block type="primary" size="large" onClick={() => setFlipped(true)}>
                  看答案
                </Button>
              ) : (
                <div className="vocab-drill__judgement">
                  <Button block danger size="large" icon={<X size={16} />} onClick={() => answer(false)}>
                    不会 · 加深
                  </Button>
                  <Button block type="primary" size="large" icon={<Check size={16} />} onClick={() => answer(true)}>
                    会 · 记住了（下次 +{REVIEW_INTERVALS[(getAllProgress()[cur.id]?.round ?? 0)] ?? '毕业'} 天复习）
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="vocab-drill__foot">
          {learnMode === 'study'
            ? '📚 学习模式：先熟悉字形+词义+发音，切换到🎯背诵模式再进入考核'
            : '建议开口念出来，多通道编码效果更好'}
        </div>
      </div>
    </>
  );
}
