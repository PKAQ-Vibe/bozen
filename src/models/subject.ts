import type { CardColor } from 'animal-island-ui';
import type { SubjectId } from './task';

export interface Subject {
  id: SubjectId;
  name: string;
  /** 复用 animal-island-ui 的 Card 配色，迁移时这里需要重新映射 */
  color: CardColor;
  emoji: string;
}
