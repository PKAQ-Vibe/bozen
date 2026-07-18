import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Card, Tag, Title } from 'animal-island-ui';
import { ArrowLeft, Play } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { storage } from '@/services';
import './VideoLibraryPage.css';

interface VideoItem {
  id: string;
  title: string;
  url: string;
}

interface VideoProgress {
  seconds: number;
  duration: number;
  updatedAt: number;
}

const MATH_VIDEOS = import.meta.glob<string>('@data/videos/math/*.mp4', {
  eager: true,
  query: '?url',
  import: 'default',
});
const TED_VIDEOS = import.meta.glob<string>('@data/videos/ted/*.mp4', {
  eager: true,
  query: '?url',
  import: 'default',
});

const COLLECTIONS = {
  math: { title: '数学视频课堂', sub: '章节精讲 · 自动记录每个视频的播放进度', files: MATH_VIDEOS },
  ted: { title: 'TED 演讲', sub: '演讲精选 · 自动记录每个视频的播放进度', files: TED_VIDEOS },
} as const;

function titleFromPath(path: string): string {
  const filename = path.split('/').pop()?.replace(/\.mp4$/i, '') ?? path;
  return decodeURIComponent(filename).replace(/[_-]+/g, ' ');
}

function progressKey(id: string): string {
  return `video.progress.${id}`;
}

function getProgress(id: string): VideoProgress {
  return storage.get<VideoProgress>(progressKey(id), { seconds: 0, duration: 0, updatedAt: 0 });
}

function formatTime(seconds: number): string {
  const value = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const secs = value % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${minutes}:${String(secs).padStart(2, '0')}`;
}

export default function VideoLibraryPage() {
  const { collection = '' } = useParams();
  const config = COLLECTIONS[collection as keyof typeof COLLECTIONS];
  const videos = useMemo<VideoItem[]>(() => {
    if (!config) return [];
    return Object.entries(config.files)
      .map(([path, url]) => ({ id: path, title: titleFromPath(path), url }))
      .sort((a, b) => a.title.localeCompare(b.title, 'zh-CN', { numeric: true }));
  }, [config]);
  const [activeId, setActiveId] = useState('');
  const [progressVersion, setProgressVersion] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSavedSecond = useRef(-1);

  const active = videos.find((video) => video.id === activeId) ?? videos[0];

  useEffect(() => {
    setActiveId(videos[0]?.id ?? '');
  }, [videos]);

  function saveProgress(force = false) {
    const player = videoRef.current;
    if (!player || !active || !Number.isFinite(player.currentTime)) return;
    const second = Math.floor(player.currentTime);
    if (!force && Math.abs(second - lastSavedSecond.current) < 5) return;
    lastSavedSecond.current = second;
    storage.set<VideoProgress>(progressKey(active.id), {
      seconds: player.ended ? 0 : player.currentTime,
      duration: Number.isFinite(player.duration) ? player.duration : 0,
      updatedAt: Date.now(),
    });
    setProgressVersion((value) => value + 1);
  }

  function restoreProgress() {
    const player = videoRef.current;
    if (!player || !active) return;
    const saved = getProgress(active.id);
    if (saved.seconds > 0 && saved.seconds < player.duration - 3) player.currentTime = saved.seconds;
    lastSavedSecond.current = Math.floor(saved.seconds);
  }

  if (!config) {
    return <><PageHeader title="视频课堂" sub="未找到这个视频分类" /><div className="page-body"><Link to="/resources"><Button>返回学习资源</Button></Link></div></>;
  }

  return (
    <>
      <PageHeader
        title={config.title}
        sub={config.sub}
        extra={<Link to="/resources"><Button size="small" icon={<ArrowLeft size={16} />}>返回学习资源</Button></Link>}
      />
      <div className="page-body video-library">
        {videos.length === 0 ? (
          <Card type="dashed" className="video-empty">
            <div className="video-empty__icon">🎬</div>
            <Title size="small" color="app-yellow">视频文件准备中</Title>
            <p>请将 MP4 文件放入 <code>data/videos/{collection}/</code>，重新启动项目后会自动显示。</p>
          </Card>
        ) : (
          <div className="video-layout">
            <Card className="video-player-card">
              <Title size="small" color="app-green">{active?.title}</Title>
              {active && (
                <video
                  key={active.id}
                  ref={videoRef}
                  className="video-player"
                  src={active.url}
                  controls
                  preload="metadata"
                  onLoadedMetadata={restoreProgress}
                  onTimeUpdate={() => saveProgress()}
                  onPause={() => saveProgress(true)}
                  onEnded={() => saveProgress(true)}
                >
                  当前浏览器不支持视频播放。
                </video>
              )}
              <div className="video-player__hint">播放位置每 5 秒自动保存，暂停或离开前也会保存。</div>
            </Card>

            <Card className="video-playlist">
              <Title size="small" color="app-yellow">播放列表 · {videos.length} 个视频</Title>
              <div className="video-playlist__items">
                {videos.map((video) => {
                  const progress = getProgress(video.id);
                  const percent = progress.duration > 0 ? Math.min(100, Math.round(progress.seconds / progress.duration * 100)) : 0;
                  return (
                    <button
                      key={`${video.id}-${progressVersion}`}
                      type="button"
                      className={`video-list-item ${video.id === active?.id ? 'video-list-item--active' : ''}`}
                      onClick={() => setActiveId(video.id)}
                    >
                      <Play size={18} />
                      <span className="video-list-item__body">
                        <strong>{video.title}</strong>
                        <span className="video-list-item__track"><i style={{ width: `${percent}%` }} /></span>
                      </span>
                      <Tag size="small" color={percent >= 95 ? 'app-green' : 'default'}>
                        {percent > 0 ? `${percent}% · ${formatTime(progress.seconds)}` : '未播放'}
                      </Tag>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
