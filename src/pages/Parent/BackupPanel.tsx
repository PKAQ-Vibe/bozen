// 家长端数据备份：导出 / 导入 / 一键清空（试用完毕）

import { useState } from 'react';
import { Button, Card, Modal, Tag } from 'animal-island-ui';
import { AlertTriangle, Download, RefreshCw, RotateCcw, Upload } from 'lucide-react';
import { downloadBackup, exportBackup, importBackup, pickBackupFile, resetDay, storage } from '@/services';
import { todayKey } from '@/utils/date';

export default function BackupPanel() {
  const [confirmClear, setConfirmClear] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const stats = (() => {
    const bak = exportBackup();
    return {
      keyCount: Object.keys(bak.data).length,
      bytes: JSON.stringify(bak.data).length,
    };
  })();

  async function doImport(clearFirst: boolean) {
    try {
      const bak = await pickBackupFile();
      const r = importBackup(bak, { clearFirst });
      if (r.ok) {
        setToast(`✅ 已导入 ${r.imported} 项 · 页面即将刷新`);
        setTimeout(() => window.location.reload(), 800);
      } else {
        setToast(`❌ 导入失败：${r.reason}`);
      }
    } catch (err) {
      setToast(`❌ 导入取消或失败：${(err as Error).message}`);
    }
  }

  function clearAll() {
    const count = storage.entries().length;
    storage.clearAll();
    setConfirmClear(false);
    setToast(`✅ 已清空 ${count} 项 · 页面即将刷新`);
    setTimeout(() => window.location.reload(), 800);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700 }}>
          💾 数据备份
        </div>
        <div style={{ fontSize: 16, color: 'var(--c-muted)', marginTop: 4 }}>
          孩子所有积分、任务历史、习惯、预支、挑战、档案 —— 都在浏览器本地
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Tag color="app-green" size="small">数据键 {stats.keyCount} 项</Tag>
          <Tag color="app-blue" size="small">大小约 {(stats.bytes / 1024).toFixed(1)} KB</Tag>
        </div>
      </Card>

      <Card>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
          导出（推荐每周做一次）
        </div>
        <Button type="primary" icon={<Download size={14} />} onClick={downloadBackup}>
          下载 backup.json
        </Button>
        <div style={{ fontSize: 16, color: 'var(--c-muted)', marginTop: 8 }}>
          文件保存在你的下载目录 · 可以用云盘 / 邮箱备份
        </div>
      </Card>

      <Card color="app-yellow">
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
          🔄 刷新今日任务（模板改动后用）
        </div>
        <div style={{ fontSize: 16, color: 'var(--c-mid)', marginBottom: 8 }}>
          今天已完成或进行中的任务会丢失 · 未完成的会按最新模板重新生成
        </div>
        <Button icon={<RefreshCw size={14} />} onClick={() => {
          resetDay(todayKey());
          setToast('✅ 今日任务已按最新模板重新生成 · 页面即将刷新');
          setTimeout(() => window.location.reload(), 800);
        }}>
          清空并重生成今日
        </Button>
      </Card>

      <Card>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
          导入（换设备 / 数据丢失时用）
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button icon={<Upload size={14} />} onClick={() => doImport(false)}>
            合并导入（追加）
          </Button>
          <Button danger icon={<RotateCcw size={14} />} onClick={() => doImport(true)}>
            覆盖导入（清空后恢复）
          </Button>
        </div>
      </Card>

      <Card color="app-red">
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, color: '#fff' }}>
          <AlertTriangle size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
          一键清空（试用完毕）
        </div>
        <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>
          清空后不可恢复；建议先导出备份再执行
        </div>
        <Button
          danger
          type="primary"
          style={{ marginTop: 10 }}
          onClick={() => setConfirmClear(true)}
        >
          清空全部数据
        </Button>
      </Card>

      {confirmClear && (
        <Modal
          open
          title="⚠️ 二次确认"
          typewriter={false}
          onClose={() => setConfirmClear(false)}
          footer={
            <div className="modal-footer">
              <Button onClick={() => setConfirmClear(false)}>取消</Button>
              <Button danger type="primary" onClick={clearAll}>确定清空</Button>
            </div>
          }
        >
          <div className="modal-body">
            这会删除孩子的全部积分、任务、习惯、挑战、预支单、兑换记录 · 不可撤销。<br />
            继续前建议先导出备份。
          </div>
        </Modal>
      )}

      {toast && (
        <Modal
          open
          title="操作结果"
          typewriter={false}
          onClose={() => setToast(null)}
          footer={<div className="modal-footer"><Button type="primary" onClick={() => setToast(null)}>好的</Button></div>}
        >
          <div className="modal-body">{toast}</div>
        </Modal>
      )}
    </div>
  );
}
