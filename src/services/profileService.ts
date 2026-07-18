// 多用户档案：家长可创建多个孩子档案，全局 activeId 决定当前视图
// 数据分片：所有 tasks/user.state/redemptions 都以 profileId 命名空间隔离

import { storage } from './storage';

export interface Profile {
  id: string;
  name: string;
  emoji: string;
  createdAt: number;
}

const PROFILES_KEY = 'profiles';
const ACTIVE_KEY = 'profiles.active';

const DEFAULT_PROFILES: Profile[] = [
  { id: 'default', name: '小明同学', emoji: '⚽', createdAt: 0 },
];

export function getProfiles(): Profile[] {
  return storage.get<Profile[]>(PROFILES_KEY, DEFAULT_PROFILES);
}
export function getActiveProfileId(): string {
  return storage.get<string>(ACTIVE_KEY, 'default');
}
export function setActiveProfileId(id: string): void {
  storage.set(ACTIVE_KEY, id);
}
export function getActiveProfile(): Profile {
  const id = getActiveProfileId();
  return getProfiles().find((p) => p.id === id) ?? DEFAULT_PROFILES[0];
}
export function saveProfile(p: Profile): void {
  const list = getProfiles();
  const idx = list.findIndex((x) => x.id === p.id);
  if (idx >= 0) list[idx] = p;
  else list.push(p);
  storage.set(PROFILES_KEY, list);
}
export function deleteProfile(id: string): void {
  if (id === 'default') return;
  storage.set(PROFILES_KEY, getProfiles().filter((p) => p.id !== id));
  if (getActiveProfileId() === id) setActiveProfileId('default');
}
