// 听诵检查配置（§十二 12.2）

import { storage } from './storage';

export interface RecitationConfig {
  /** 启用 AI 判读（需 Key） */
  aiEnabled: boolean;
  /** AI 服务商 */
  aiProvider: 'openai' | 'moonshot' | 'zhipu';
  /** AI Key（本地保存，不上传） */
  aiKey: string;
  /** 录制方式 */
  recordMode: 'audio' | 'audio_video';
  /** 盲背模式（背诵时隐藏原文） */
  blindMode: boolean;
  /** 乱序抽背 */
  shuffleMode: boolean;
  /** 视线检测（防低头照读） */
  gazeCheck: boolean;
  /** 清晰度门槛（0-1） */
  clarityThreshold: number;
  /** 听诵范围 */
  scopeChemistry: boolean;
  scopeEnglish: boolean;
  scopeChinese: boolean;
}

const KEY = 'recitation.config';

const DEFAULT: RecitationConfig = {
  aiEnabled: false,
  aiProvider: 'openai',
  aiKey: '',
  recordMode: 'audio',
  blindMode: true,
  shuffleMode: false,
  gazeCheck: false,
  clarityThreshold: 0.7,
  scopeChemistry: true,
  scopeEnglish: true,
  scopeChinese: true,
};

export function getRecitationConfig(): RecitationConfig {
  return storage.get<RecitationConfig>(KEY, DEFAULT);
}

export function saveRecitationConfig(cfg: RecitationConfig): void {
  storage.set(KEY, cfg);
}
