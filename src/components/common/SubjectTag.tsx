import { Tag } from 'animal-island-ui';
import type { SubjectId } from '@/models';
import { seedSubjects } from '@/services';

interface Props {
  subject: SubjectId;
  size?: 'small' | 'medium' | 'large';
}

export default function SubjectTag({ subject, size = 'small' }: Props) {
  const s = seedSubjects.find((x) => x.id === subject);
  if (!s) return null;
  return (
    <Tag color={s.color} size={size}>
      <span style={{ marginRight: 4 }}>{s.emoji}</span>
      {s.name}
    </Tag>
  );
}
