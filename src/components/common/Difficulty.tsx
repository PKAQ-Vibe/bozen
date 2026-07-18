interface Props {
  level: 1 | 2 | 3 | 4 | 5;
}

export default function Difficulty({ level }: Props) {
  return (
    <span aria-label={`难度 ${level} 星`} title={`难度 ${level} 星`}>
      {'★'.repeat(level)}
      <span style={{ opacity: 0.25 }}>{'★'.repeat(5 - level)}</span>
    </span>
  );
}
