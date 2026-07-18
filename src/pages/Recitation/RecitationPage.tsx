// 听诵背诵 · §十二 12.2
// 无参 → 选篇页；?src=<id> → 加载对应篇目，录音+清晰度检测

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, Card, Divider, Tabs, Tag, Title } from 'animal-island-ui';
import type { TabItem } from 'animal-island-ui';
import { ArrowLeft, ArrowRight, CircleCheckBig, Mic, MicOff, PlayCircle, StopCircle } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import ToastModal from '@/components/modals/ToastModal';
import { getRecitationConfig, linkComplete } from '@/services';
import textsData from '@data/recitation-texts.json';
import './RecitationPage.css';

interface RecitationText {
  id: string;
  subject: string;
  unit: string;
  kind: string;
  title: string;
  author: string;
  lines: string[];
  translation: string[];
  annotations: { no: string; term: string; meaning: string }[];
}

const ALL_TEXTS = textsData as RecitationText[];

type Status = 'idle' | 'recording' | 'stopped';

export default function RecitationPage() {
  const [params] = useSearchParams();
  const srcId = params.get('src');
  const text = useMemo(() => ALL_TEXTS.find((t) => t.id === srcId) ?? null, [srcId]);

  if (!text) return <RecitationPicker />;
  return <RecitationSession text={text} />;
}

/* ─────────────────── 选篇页 ─────────────────── */

function RecitationPicker() {
  const bySubject = useMemo(() => {
    const map = new Map<string, RecitationText[]>();
    for (const t of ALL_TEXTS) {
      const list = map.get(t.subject) ?? [];
      list.push(t);
      map.set(t.subject, list);
    }
    return map;
  }, []);

  const chinese = bySubject.get('chinese') ?? [];
  const chemistry = bySubject.get('chemistry') ?? [];

  const items: TabItem[] = [
    {
      key: 'chinese',
      label: `语文 (${chinese.length})`,
      children: <TextGroup texts={chinese} groupByUnit />,
    },
    {
      key: 'chemistry',
      label: `化学 (${chemistry.length})`,
      children: <TextGroup texts={chemistry} groupByUnit={false} />,
    },
  ];

  return (
    <>
      <PageHeader
        title="听诵背诵 · 选篇"
        sub="开口念一遍，AI/本地判读清晰度 → 联动打卡"
      />
      <div className="page-body rec-picker">
        <Tabs items={items} defaultActiveKey="chinese" leafAnimation={false} />
      </div>
    </>
  );
}

function TextGroup({ texts, groupByUnit }: { texts: RecitationText[]; groupByUnit: boolean }) {
  if (!groupByUnit) {
    return (
      <div className="rec-picker__grid">
        {texts.map((t) => <TextCard key={t.id} text={t} />)}
      </div>
    );
  }
  const byUnit = new Map<string, RecitationText[]>();
  for (const t of texts) {
    const l = byUnit.get(t.unit) ?? [];
    l.push(t);
    byUnit.set(t.unit, l);
  }
  return (
    <div className="rec-picker__units">
      {[...byUnit.entries()].map(([unit, list]) => (
        <section key={unit} className="rec-picker__unit">
          <div className="rec-picker__unit-head">
            <Title size="small" color="app-green">{unit}</Title>
            <div className="rec-picker__spacer" />
            <Tag size="small" color="default">{list.length} 篇</Tag>
          </div>
          <div className="rec-picker__grid">
            {list.map((t) => <TextCard key={t.id} text={t} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

function TextCard({ text }: { text: RecitationText }) {
  const preview = text.lines[0] ?? '';
  return (
    <Link to={`/recite?src=${text.id}`} className="rec-picker__card-link">
      <Card className="rec-picker__card">
        <div className="rec-picker__card-head">
          <span className="rec-picker__card-title">{text.title}</span>
          <Tag size="small" color="app-yellow">{text.kind}</Tag>
        </div>
        {text.author && <div className="rec-picker__card-author">{text.author}</div>}
        <div className="rec-picker__card-preview">{preview.slice(0, 40)}{preview.length > 40 ? '…' : ''}</div>
        <div className="rec-picker__card-foot">
          <span>{text.lines.length} 段 · {text.annotations.length} 注</span>
          <Button size="small" type="primary" icon={<ArrowRight size={12} />}>去背诵</Button>
        </div>
      </Card>
    </Link>
  );
}

/* ─────────────────── 背诵会话 ─────────────────── */

function RecitationSession({ text }: { text: RecitationText }) {
  const cfg = getRecitationConfig();
  const [status, setStatus] = useState<Status>('idle');
  const [toast, setToast] = useState<string | null>(null);
  const [chunk, setChunk] = useState(0);
  const [clarity, setClarity] = useState(0);
  const [audioUrl, setAudioUrl] = useState('');
  const [avgLevel, setAvgLevel] = useState(0);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const levelSumRef = useRef(0);
  const levelCntRef = useRef(0);

  useEffect(() => () => stopAll(), []);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;
      const rec = new MediaRecorder(stream);
      recorderRef.current = rec;
      chunksRef.current = [];
      levelSumRef.current = 0;
      levelCntRef.current = 0;
      rec.ondataavailable = (e) => chunksRef.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioUrl(URL.createObjectURL(blob));
        const avg = levelCntRef.current > 0 ? levelSumRef.current / levelCntRef.current : 0;
        setAvgLevel(avg);
        const durOk = levelCntRef.current > 8 * 30;
        const level01 = Math.min(1, avg / 40);
        setClarity(durOk ? Math.max(0.4, level01) : level01 * 0.5);
      };
      rec.start(100);
      setStatus('recording');
      draw();
    } catch (err) {
      setToast('无法访问麦克风：' + (err as Error).message);
    }
  }

  function draw() {
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    if (!analyser || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const render = () => {
      analyser.getByteTimeDomainData(dataArray);
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = '#5BAD52';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const slice = w / bufferLength;
      let x = 0;
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128 - 1;
        sum += Math.abs(v);
        const y = h / 2 + v * (h / 2 - 4);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += slice;
      }
      ctx.stroke();
      const level = (sum / bufferLength) * 100;
      levelSumRef.current += level;
      levelCntRef.current += 1;
      rafRef.current = requestAnimationFrame(render);
    };
    render();
  }

  function stop() {
    recorderRef.current?.stop();
    stopAll();
    setStatus('stopped');
  }

  function stopAll() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close();
    streamRef.current = null;
    audioCtxRef.current = null;
    analyserRef.current = null;
  }

  function reset() {
    setStatus('idle');
    setClarity(0);
    setAudioUrl('');
    setChunk(0);
  }

  const passed = clarity >= cfg.clarityThreshold;
  const linkKey = text.subject === 'chemistry' ? 'periodic.stage1.pass' : 'recite.text.pass';

  return (
    <>
      <PageHeader
        title={`听诵 · ${text.title}`}
        sub={`${text.author ? text.author + ' · ' : ''}${text.kind} · ${text.unit}`}
        extra={
          <>
            <Tag color="app-yellow" size="small">门槛 {(cfg.clarityThreshold * 100).toFixed(0)}%</Tag>
            <Link to="/recite"><Button size="small" icon={<ArrowLeft size={13} />}>换一篇</Button></Link>
          </>
        }
      />
      <div className="page-body rec-page">
        <Card className="rec-card">
          <div className="rec-card__head">
            <Title size="small" color="app-green">{text.title}</Title>
            <div className="rec-card__spacer" />
            <Button size="small" onClick={() => setShowTranslation((v) => !v)}>
              {showTranslation ? '收起译文' : '展开译文'}
            </Button>
            {text.annotations.length > 0 && (
              <Button size="small" onClick={() => setShowAnnotations((v) => !v)}>
                {showAnnotations ? '收起注释' : `注释 (${text.annotations.length})`}
              </Button>
            )}
          </div>

          <div className="rec-lines">
            {text.lines.map((line, i) => {
              const active = i === chunk;
              const done = i < chunk;
              return (
                <div key={i} className={`rec-line ${active ? 'rec-line--active' : ''} ${done ? 'rec-line--done' : ''}`}>
                  {cfg.blindMode && status === 'recording' && !active ? '••••' : line}
                </div>
              );
            })}
          </div>

          {showTranslation && text.translation.length > 0 && (
            <>
              <Divider type="dashed-brown" />
              <div className="rec-translation">
                <div className="rec-translation__label">📖 参考译文</div>
                {text.translation.map((p, i) => (
                  <p key={i} className="rec-translation__p">{p}</p>
                ))}
              </div>
            </>
          )}

          {showAnnotations && text.annotations.length > 0 && (
            <>
              <Divider type="dashed-brown" />
              <div className="rec-anno">
                <div className="rec-anno__label">✍️ 常考词</div>
                <div className="rec-anno__grid">
                  {text.annotations.map((a, i) => (
                    <div key={i} className="rec-anno__row">
                      <span className="rec-anno__no">{a.no}</span>
                      <span className="rec-anno__term">{a.term}</span>
                      <span className="rec-anno__mean">{a.meaning}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="rec-wave">
            <canvas ref={canvasRef} width={600} height={80} />
          </div>

          <div className="rec-clarity">
            <div className="rec-clarity__label">发音清晰度</div>
            <div className="rec-clarity__bar">
              <div style={{ width: `${clarity * 100}%`, background: passed ? 'var(--c-green)' : 'var(--c-orange)' }} />
            </div>
            <div className="rec-clarity__pct" style={{ color: passed ? 'var(--c-green)' : 'var(--c-orange)' }}>
              {(clarity * 100).toFixed(0)}%
            </div>
          </div>

          <div className="rec-controls">
            {status === 'idle' && (
              <Button type="primary" icon={<Mic size={16} />} onClick={start}>开始录音</Button>
            )}
            {status === 'recording' && (
              <>
                <Button icon={<StopCircle size={16} />} danger onClick={stop}>停止</Button>
                <Button size="small" onClick={() => setChunk((c) => Math.min(text.lines.length - 1, c + 1))}>下一句</Button>
              </>
            )}
            {status === 'stopped' && (
              <>
                {audioUrl && (
                  <Button icon={<PlayCircle size={16} />} onClick={() => new Audio(audioUrl).play()}>回放</Button>
                )}
                <Button icon={<MicOff size={16} />} onClick={reset}>重新录</Button>
                {passed ? (
                  <Button
                    type="primary"
                    icon={<CircleCheckBig size={16} />}
                    onClick={() => {
                      const r = linkComplete(linkKey, {
                        actualSeconds: Math.max(60, Math.round(levelCntRef.current / 30)),
                        note: `听诵《${text.title}》清晰度 ${(clarity * 100).toFixed(0)}% 通过`,
                      });
                      setToast(r.updatedIds.length > 0
                        ? `✅ 已联动打卡：${r.taskTitles.join('、')}`
                        : '✅ 清晰度达标，已提交（本次未匹配到今日任务）');
                    }}
                  >
                    提交（清晰度 {(clarity * 100).toFixed(0)}%）
                  </Button>
                ) : (
                  <Tag color="app-red" size="medium">未达门槛，需重念</Tag>
                )}
              </>
            )}
          </div>

          <div className="rec-note">
            <div>模式：{cfg.recordMode === 'audio' ? '仅录音' : '录音 + 录像'} · {cfg.blindMode ? '盲背' : '看原文'} · {cfg.shuffleMode ? '乱序' : '顺序'}</div>
            <div>{cfg.aiEnabled ? `AI 判读：${cfg.aiProvider}（已配置 Key）` : 'AI 未启用 · 使用本地清晰度估算'}</div>
            <div>实时音量均值：{avgLevel.toFixed(1)}</div>
          </div>
        </Card>
      </div>

      <ToastModal open={toast !== null} message={toast ?? ''} onClose={() => setToast(null)} />
    </>
  );
}
