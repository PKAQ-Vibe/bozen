// 种子数据装载。Pro 迁移点：此文件改为从 HTTP 接口拉取即可，模型不变。

import subjectsSeed from '@data/subjects.json';
import tasksSeed from '@data/tasks.json';
import shopSeed from '@data/shop.json';
import configSeed from '@data/config.json';
import type { IncentiveConfig, ShopItem, Subject, TaskTemplate } from '@/models';

export const seedSubjects = subjectsSeed as Subject[];
export const seedTaskTemplates = tasksSeed as TaskTemplate[];
export const seedShopItems = shopSeed as ShopItem[];
export const seedConfig = configSeed as IncentiveConfig;
