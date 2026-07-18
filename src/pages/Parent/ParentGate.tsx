import { useEffect, useState } from 'react';
import { Delete, KeyRound, LockKeyhole } from 'lucide-react';
import ParentPage from './ParentPage';
import { sha256, storage } from '@/services';
import './ParentGate.css';

const PIN_HASH_KEY = 'parent.pinHash';
const PIN_LEN = 4;

/** 家长端拦截：首次无 PIN → 设置流；有 PIN → 每次进入均验证 */
export default function ParentGate() {
  const [unlocked, setUnlocked] = useState(false);
  const [hasPin, setHasPin] = useState(() => Boolean(storage.get<string | null>(PIN_HASH_KEY, null)));

  if (unlocked) return <ParentPage />;

  if (!hasPin) {
    return (
      <SetPinScreen
        onDone={async (pin) => {
          storage.set(PIN_HASH_KEY, await sha256(pin));
          setHasPin(true);
          setUnlocked(true);
        }}
      />
    );
  }

  return (
    <VerifyPinScreen
      onOk={() => {
        setUnlocked(true);
      }}
    />
  );
}

/* ───────── 通用键盘 ───────── */

interface KeypadProps {
  onKey: (n: string) => void;
  onClear: () => void;
  onDel: () => void;
  small?: boolean;
}

function Keypad({ onKey, onClear, onDel, small }: KeypadProps) {
  const rows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
  ];
  return (
    <div className={`pin-pad ${small ? 'pin-pad--sm' : ''}`}>
      {rows.map((row, i) => (
        <div key={i} className="pin-pad__row">
          {row.map((n) => (
            <button key={n} type="button" className="pin-key" onClick={() => onKey(n)}>{n}</button>
          ))}
        </div>
      ))}
      <div className="pin-pad__row">
        <button type="button" className="pin-key pin-key--ghost" onClick={onClear}>清空</button>
        <button type="button" className="pin-key" onClick={() => onKey('0')}>0</button>
        <button type="button" className="pin-key pin-key--ghost" onClick={onDel}>
          <Delete size={18} color="var(--c-muted)" />
        </button>
      </div>
    </div>
  );
}

interface DotsProps { len: number; total: number }
function Dots({ len, total }: DotsProps) {
  return (
    <div className="pin-dots">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`pin-dot ${i < len ? 'pin-dot--on' : ''}`} />
      ))}
    </div>
  );
}

/* ───────── Verify（Itc5N） ───────── */

interface VerifyProps { onOk: () => void }

function VerifyPinScreen({ onOk }: VerifyProps) {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (pin.length !== PIN_LEN) return;
    void sha256(pin).then((hash) => {
      const saved = storage.get<string | null>(PIN_HASH_KEY, null);
      if (hash === saved) onOk();
      else {
        setErr('密码不正确，请重试');
        setTimeout(() => setPin(''), 400);
      }
    });
  }, [pin, onOk]);

  return (
    <div className="pin-page">
      <div className="pin-card">
        <div className="pin-card__icon pin-card__icon--green">
          <LockKeyhole size={30} color="var(--c-green)" />
        </div>
        <div className="pin-card__title">家长验证</div>
        <div className="pin-card__sub">请输入家长密码，进入家长管理端</div>
        <Dots len={pin.length} total={PIN_LEN} />
        {err && <div className="pin-card__err">{err}</div>}
        <Keypad
          onKey={(n) => setPin((p) => (p.length < PIN_LEN ? p + n : p))}
          onClear={() => { setPin(''); setErr(''); }}
          onDel={() => { setPin((p) => p.slice(0, -1)); setErr(''); }}
        />
        <div className="pin-card__hint">密码仅家长知道 · 忘记可长按重置</div>
      </div>
    </div>
  );
}

/* ───────── Set（N6EIWP） ───────── */

interface SetProps { onDone: (pin: string) => void | Promise<void> }

function SetPinScreen({ onDone }: SetProps) {
  const [state, setState] = useState<{ pin: string; confirm: string; err: string }>({
    pin: '', confirm: '', err: '',
  });
  const { pin, confirm, err } = state;

  function onKey(n: string) {
    setState((s) => {
      if (s.pin.length < PIN_LEN) return { ...s, err: '', pin: s.pin + n };
      if (s.confirm.length < PIN_LEN) return { ...s, err: '', confirm: s.confirm + n };
      return s;
    });
  }

  function onDel() {
    setState((s) => {
      if (s.confirm.length > 0) return { ...s, err: '', confirm: s.confirm.slice(0, -1) };
      if (s.pin.length > 0) return { ...s, err: '', pin: s.pin.slice(0, -1) };
      return s;
    });
  }

  function onClear() { setState({ pin: '', confirm: '', err: '' }); }

  function save() {
    setState((s) => {
      if (s.pin.length !== PIN_LEN) return { ...s, err: '请先输入 4 位新密码' };
      if (s.pin !== s.confirm) return { ...s, err: '两次输入不一致' };
      queueMicrotask(() => onDone(s.pin));
      return s;
    });
  }

  return (
    <div className="pin-page">
      <div className="pin-card pin-card--set">
        <div className="pin-card__icon pin-card__icon--green">
          <KeyRound size={28} color="var(--c-green)" />
        </div>
        <div className="pin-card__title">设置家长密码</div>
        <div className="pin-card__sub">首次使用直接设置；设置后进入管理端需验证</div>

        <div className="pin-field">
          <div className="pin-field__label">新密码（4 位数字）</div>
          <Dots len={pin.length} total={PIN_LEN} />
        </div>
        <div className="pin-field">
          <div className="pin-field__label">确认密码</div>
          <Dots len={confirm.length} total={PIN_LEN} />
        </div>

        {err && <div className="pin-card__err">{err}</div>}

        <Keypad onKey={onKey} onClear={onClear} onDel={onDel} small />

        <button type="button" className="pin-save" onClick={save}>
          ✓  保存并进入
        </button>
      </div>
    </div>
  );
}
