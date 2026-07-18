// 商城商品服务：seed + 家长自定义礼品（本地加密存储）合并

import type { ShopItem } from '@/models';
import { seedShopItems } from './seed';
import { storage } from './storage';

const CUSTOM_ITEMS_KEY = 'shop.custom';

export function getCustomShopItems(): ShopItem[] {
  return storage.get<ShopItem[]>(CUSTOM_ITEMS_KEY, []);
}

export function saveCustomShopItem(item: ShopItem): void {
  const list = getCustomShopItems();
  const idx = list.findIndex((it) => it.id === item.id);
  if (idx >= 0) list[idx] = item;
  else list.push(item);
  storage.set(CUSTOM_ITEMS_KEY, list);
}

export function deleteCustomShopItem(id: string): void {
  storage.set(CUSTOM_ITEMS_KEY, getCustomShopItems().filter((it) => it.id !== id));
}

export function getAllShopItems(): ShopItem[] {
  return [...seedShopItems, ...getCustomShopItems()];
}
