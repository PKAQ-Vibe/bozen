import { useMemo } from 'react';
import { Card, Title } from 'animal-island-ui';
import { ArrowUpRight } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import resourcesData from '@data/resources.json';
import './ResourcesPage.css';

interface ResourceItem {
  id: string;
  subject: string;
  emoji: string;
  title: string;
  sub: string;
  url: string;
}

const SECTIONS: { key: string; label: string; emoji: string }[] = [
  { key: 'english', label: '英语', emoji: '📚' },
  { key: 'math', label: '数学', emoji: '➗' },
  { key: 'chinese', label: '语文', emoji: '📖' },
  { key: 'physics', label: '物理', emoji: '🔬' },
  { key: 'chemistry', label: '化学', emoji: '🧪' },
  { key: 'history', label: '历史', emoji: '📜' },
  { key: 'politics', label: '政治', emoji: '🏛' },
  { key: 'geography', label: '地理', emoji: '🌍' },
  { key: 'biology', label: '生物', emoji: '🌱' },
  { key: 'critical', label: '思辨拓展', emoji: '💡' },
];

export default function ResourcesPage() {
  const grouped = useMemo(() => {
    const map = new Map<string, ResourceItem[]>();
    for (const r of resourcesData as ResourceItem[]) {
      const list = map.get(r.subject) ?? [];
      list.push(r);
      map.set(r.subject, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => Number(!a.url || a.url === '#') - Number(!b.url || b.url === '#'));
    }
    return map;
  }, []);

  return (
    <>
      <PageHeader title="学习资源" sub="精选免费资源，点击直接前往学习" />
      <div className="page-body resources-page">
        {SECTIONS.map((s) => {
          const items = grouped.get(s.key) ?? [];
          if (items.length === 0) return null;
          return (
            <section key={s.key} className="res-section">
              <div className="res-section__head">
                <span className="res-section__emoji">{s.emoji}</span>
                <Title size="small" color="app-green" className="res-section__title">{s.label}</Title>
                <div className="res-section__spacer" />
                <span className="res-section__count">{items.length} 项</span>
              </div>
              <div className="res-grid">
                {items.map((r) => {
                  const hasLink = Boolean(r.url && r.url !== '#');
                  const card = (
                    <Card className={`res-card ${hasLink ? '' : 'res-card--disabled'}`}>
                      <div className="res-card__icon">{r.emoji}</div>
                      <div className="res-card__info">
                        <div className="res-card__title">{r.title}</div>
                        <div className="res-card__sub">{r.sub}</div>
                      </div>
                      {hasLink ? <ArrowUpRight size={16} color="var(--c-green)" /> : <span className="res-card__unavailable">暂无链接</span>}
                    </Card>
                  );
                  return hasLink ? (
                    <a key={r.id} className="res-card-link" href={r.url} target="_blank" rel="noopener noreferrer">
                      {card}
                    </a>
                  ) : (
                    <div key={r.id} className="res-card-link" aria-disabled="true">{card}</div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
