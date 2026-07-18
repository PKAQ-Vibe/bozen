interface Props {
  title: string;
  hint: string;
}

export default function StubPage({ title, hint }: Props) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px dashed var(--c-border)',
        borderRadius: 16,
        padding: 40,
        textAlign: 'center',
        color: 'var(--c-muted)',
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--c-dark)' }}>{title}</div>
      <div style={{ marginTop: 8, fontSize: 16 }}>{hint}</div>
    </div>
  );
}
