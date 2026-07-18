// 导出/导入全部加密存储中的业务数据（防丢）

import { storage } from './storage';

export interface Backup {
  version: 1;
  exportedAt: number;
  data: Record<string, unknown>;
}

export function exportBackup(): Backup {
  const data: Record<string, unknown> = {};
  for (const [key, value] of storage.entries()) data[key] = value;
  return { version: 1, exportedAt: Date.now(), data };
}

export function downloadBackup(): void {
  const bak = exportBackup();
  const json = JSON.stringify(bak, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const t = new Date();
  const stamp = `${t.getFullYear()}${String(t.getMonth() + 1).padStart(2, '0')}${String(t.getDate()).padStart(2, '0')}-${String(t.getHours()).padStart(2, '0')}${String(t.getMinutes()).padStart(2, '0')}`;
  a.href = url;
  a.download = `bozen-backup-${stamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importBackup(bak: Backup, opts: { clearFirst?: boolean } = {}): { ok: boolean; imported: number; reason?: string } {
  if (typeof window === 'undefined') return { ok: false, imported: 0, reason: '不在浏览器环境' };
  if (bak.version !== 1) return { ok: false, imported: 0, reason: '备份版本不兼容' };
  if (opts.clearFirst) {
    storage.clearAll();
  }
  let imported = 0;
  for (const [key, value] of Object.entries(bak.data)) {
    storage.set(key, value);
    imported += 1;
  }
  return { ok: true, imported };
}

export function pickBackupFile(): Promise<Backup> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return reject(new Error('未选择文件'));
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const bak = JSON.parse(reader.result as string) as Backup;
          resolve(bak);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    };
    input.click();
  });
}
