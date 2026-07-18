// 听诵与作业检查设置（ZJ8nH）· §十二 12.2.1-12.2.3

import { useState } from 'react';
import { Button, Card, Input, Radio, Select, Switch, Title } from 'animal-island-ui';
import { CircleCheckBig } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { getRecitationConfig, saveRecitationConfig } from '@/services';
import type { RecitationConfig } from '@/services';
import './RecitationPage.css';

export default function RecitationSettingsPage() {
  const [cfg, setCfg] = useState<RecitationConfig>(getRecitationConfig());
  const [saved, setSaved] = useState(false);

  function patch<K extends keyof RecitationConfig>(k: K, v: RecitationConfig[K]) {
    setCfg({ ...cfg, [k]: v });
    setSaved(false);
  }

  function save() {
    saveRecitationConfig(cfg);
    setSaved(true);
  }

  return (
    <>
      <PageHeader
        title="听诵与作业检查设置"
        sub="配置 AI 判读、录制方式与防照读选项"
        extra={
          <Button type="primary" icon={<CircleCheckBig size={15} />} onClick={save}>
            {saved ? '✅ 已保存' : '保存'}
          </Button>
        }
      />
      <div className="page-body rec-page">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 720, width: '100%' }}>
          <Card>
            <Title size="small" color="app-yellow">🤖 AI 智能检查</Title>
            <div className="rec-setting-row">
              <span>启用 AI 判读</span>
              <Switch checked={cfg.aiEnabled} onChange={(v) => patch('aiEnabled', v)} />
            </div>
            {cfg.aiEnabled && (
              <>
                <div className="rec-setting-row">
                  <span>AI 服务商</span>
                  <Select
                    value={cfg.aiProvider}
                    onChange={(k) => patch('aiProvider', k as RecitationConfig['aiProvider'])}
                    options={[
                      { key: 'openai', label: 'OpenAI (通用)' },
                      { key: 'moonshot', label: 'Moonshot' },
                      { key: 'zhipu', label: '智谱 ChatGLM' },
                    ]}
                  />
                </div>
                <div className="rec-setting-row">
                  <span>API Key（仅本地保存）</span>
                  <Input
                    value={cfg.aiKey}
                    onChange={(e) => patch('aiKey', e.target.value)}
                    placeholder="sk-..."
                  />
                </div>
              </>
            )}
          </Card>

          <Card>
            <Title size="small" color="app-orange">🎥 录制方式</Title>
            <Radio
              options={[
                { label: '仅录音', value: 'audio' },
                { label: '录音 + 录像（推荐）', value: 'audio_video' },
              ]}
              value={cfg.recordMode}
              onChange={(v) => patch('recordMode', v as RecitationConfig['recordMode'])}
              direction="vertical"
            />
          </Card>

          <Card>
            <Title size="small" color="app-red">🚫 防照读组合</Title>
            <div className="rec-setting-row">
              <span>盲背模式（背诵时隐藏原文）</span>
              <Switch checked={cfg.blindMode} onChange={(v) => patch('blindMode', v)} />
            </div>
            <div className="rec-setting-row">
              <span>乱序抽背</span>
              <Switch checked={cfg.shuffleMode} onChange={(v) => patch('shuffleMode', v)} />
            </div>
            <div className="rec-setting-row">
              <span>AI 视线检测（防低头照读）</span>
              <Switch checked={cfg.gazeCheck} onChange={(v) => patch('gazeCheck', v)} />
            </div>
            <div className="rec-setting-row">
              <span>清晰度门槛</span>
              <div style={{ width: 240 }}>
                <Input
                  type="number"
                  value={String(cfg.clarityThreshold)}
                  onChange={(e) => patch('clarityThreshold', Math.max(0, Math.min(1, Number(e.target.value) || 0)))}
                  suffix="0-1"
                />
              </div>
            </div>
          </Card>

          <Card>
            <Title size="small" color="app-green">📖 适用学科</Title>
            <div className="rec-setting-row">
              <span>化学（元素周期表 / 化学用语）</span>
              <Switch checked={cfg.scopeChemistry} onChange={(v) => patch('scopeChemistry', v)} />
            </div>
            <div className="rec-setting-row">
              <span>英语（单词 / 课文朗读）</span>
              <Switch checked={cfg.scopeEnglish} onChange={(v) => patch('scopeEnglish', v)} />
            </div>
            <div className="rec-setting-row">
              <span>语文（古诗文 / 课文背诵）</span>
              <Switch checked={cfg.scopeChinese} onChange={(v) => patch('scopeChinese', v)} />
            </div>
          </Card>
        </div>
      </div>
      <style>{`
        .rec-setting-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 4px;
          font-size: 16px;
          color: var(--c-dark);
        }
        .rec-setting-row > span { flex: 1; }
      `}</style>
    </>
  );
}
