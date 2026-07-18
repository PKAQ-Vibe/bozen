// §八 #2 反作弊：actualSeconds / pomodoros 等关键字段防篡改
// 用一个本地盐 + FNV-1a hash 生成校验码，写入 task 的 sig 字段
// 手工篡改持久化数据会导致 sig 不匹配 → 结算时视为作废

import { storage } from './storage';

const LOCAL_SALT_KEY = 'integrity.salt';

function getSalt(): string {
  let s = storage.get<string | null>(LOCAL_SALT_KEY, null);
  if (!s) {
    // 生成一个 16 字节盐，只在本设备存在
    const bytes = new Uint8Array(16);
    (globalThis.crypto ?? (globalThis as any).msCrypto)?.getRandomValues(bytes);
    s = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    storage.set(LOCAL_SALT_KEY, s);
  }
  return s;
}

// FNV-1a 32-bit（够用了；这只是防手改，不是防远程攻击）
function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** 给关键字段签名 */
export function signTask(payload: {
  id: string;
  actualSeconds: number;
  pomodoros: number;
  completedAt?: number;
}): string {
  const salt = getSalt();
  const canonical = [payload.id, payload.actualSeconds, payload.pomodoros, payload.completedAt ?? ''].join('|');
  return fnv1a(salt + '|' + canonical);
}

export function verifyTaskSig(
  payload: { id: string; actualSeconds: number; pomodoros: number; completedAt?: number },
  sig: string | undefined,
): boolean {
  if (!sig) return payload.actualSeconds === 0 && payload.pomodoros === 0;
  return signTask(payload) === sig;
}
