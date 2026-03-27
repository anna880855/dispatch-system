import { useState } from 'react';

const C = {
  bg: '#f0ebe4', card: '#faf7f4', border: '#e4d9cf',
  primary: '#8b9e8d', primaryH: '#6e8070', primaryL: '#dce8dd',
  accent: '#7d93a8', accentL: '#dce6ee',
  text: '#463f3a', muted: '#8a7f79',
  alert: '#c07a62', alertL: '#f9ede8',
  success: '#7a9e7e', successL: '#edf3ee',
  warning: '#c4a55a', warningL: '#f7f0e1',
  sidebar: '#4a5e4c',
};
export { C };

export function Card({ children, style }) {
  return (
    <div style={{ background: C.card, borderRadius: 18, padding: 28, border: `1px solid ${C.border}`, ...style }}>
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, color: C.text, margin: 0 }}>{title}</h1>
      {subtitle && <p style={{ color: C.muted, fontSize: 13, margin: '5px 0 0' }}>{subtitle}</p>}
    </div>
  );
}

export function Input({ style, ...props }) {
  return (
    <input
      style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, fontSize: 13, color: C.text, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', ...style }}
      {...props}
    />
  );
}

export function Select({ style, children, ...props }) {
  return (
    <select
      style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, fontSize: 13, color: C.text, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', ...style }}
      {...props}
    >
      {children}
    </select>
  );
}

export function BtnPrimary({ children, style, ...props }) {
  return (
    <button style={{ padding: '10px 24px', borderRadius: 12, border: 'none', background: C.primary, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit', ...style }} {...props}>
      {children}
    </button>
  );
}

export function BtnSecondary({ children, style, ...props }) {
  return (
    <button style={{ padding: '8px 18px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.card, color: C.text, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', ...style }} {...props}>
      {children}
    </button>
  );
}

export function BtnSmall({ children, style, ...props }) {
  return (
    <button style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.text, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', ...style }} {...props}>
      {children}
    </button>
  );
}

export function Label({ children, required }) {
  return (
    <label style={{ display: 'block', fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 500 }}>
      {children}{required && <span style={{ color: C.alert }}> *</span>}
    </label>
  );
}

export function FormField({ label, required, children, fullWidth }) {
  return (
    <div style={fullWidth ? { gridColumn: '1/-1' } : {}}>
      <Label required={required}>{label}</Label>
      {children}
    </div>
  );
}

export function Alert({ type, children }) {
  const colors = {
    success: { bg: C.successL, color: C.success },
    error: { bg: C.alertL, color: C.alert },
    warn: { bg: C.warningL, color: C.warning },
    info: { bg: C.accentL, color: C.accent },
  };
  const { bg, color } = colors[type] || colors.info;
  return (
    <div style={{ background: bg, color, padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500, marginBottom: 14 }}>
      {children}
    </div>
  );
}

export function Badge({ children, color = 'primary' }) {
  const styles = {
    primary: { background: C.primaryL, color: C.primaryH },
    accent: { background: C.accentL, color: C.accent },
    alert: { background: C.alertL, color: C.alert },
    success: { background: C.successL, color: C.success },
    warning: { background: C.warningL, color: C.warning },
  };
  return (
    <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, ...styles[color] }}>
      {children}
    </span>
  );
}

export function Tab({ id, label, active, onClick }) {
  return (
    <button
      onClick={() => onClick(id)}
      style={{
        padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
        border: `1px solid ${active ? C.primary : C.border}`,
        background: active ? C.primaryL : C.card,
        color: active ? C.primaryH : C.text,
        fontWeight: active ? 600 : 400,
      }}
    >
      {label}
    </button>
  );
}

export function SearchableSelect({ options, value, onChange, placeholder }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const filtered = query ? options.filter(o => o.includes(query)) : options;

  return (
    <div style={{ position: 'relative' }}>
      <Input
        value={query || value}
        onChange={e => { setQuery(e.target.value); onChange(''); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder={placeholder}
      />
      {open && filtered.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, maxHeight: 220, overflowY: 'auto', zIndex: 300, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', marginTop: 4 }}>
          {filtered.map(opt => (
            <div
              key={opt}
              onMouseDown={() => { onChange(opt); setQuery(''); setOpen(false); }}
              style={{ padding: '10px 16px', fontSize: 13, cursor: 'pointer', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}
              onMouseEnter={e => e.currentTarget.style.background = C.primaryL}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              {opt === value && <span style={{ color: C.primary, fontSize: 12 }}>✓</span>}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt}</span>
            </div>
          ))}
        </div>
      )}
      {value && (
        <div style={{ marginTop: 6, fontSize: 11, color: C.success }}>✓ {value}</div>
      )}
    </div>
  );
}

export function MultiSelect({ options, selected, onChange, placeholder }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const filtered = query ? options.filter(o => o.includes(query)) : options;

  function toggle(opt) {
    if (selected.includes(opt)) onChange(selected.filter(x => x !== opt));
    else onChange([...selected, opt]);
  }

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder={`🔍 ${placeholder}（共${options.length}個）`}
        />
        {open && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, maxHeight: 220, overflowY: 'auto', zIndex: 300, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', marginTop: 4 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '12px 16px', color: C.muted, fontSize: 13 }}>找不到符合的單位</div>
            ) : filtered.map(opt => (
              <div
                key={opt}
                onMouseDown={() => toggle(opt)}
                style={{ padding: '10px 16px', fontSize: 13, cursor: 'pointer', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10, background: selected.includes(opt) ? C.primaryL : '' }}
                onMouseEnter={e => e.currentTarget.style.background = C.primaryL}
                onMouseLeave={e => e.currentTarget.style.background = selected.includes(opt) ? C.primaryL : ''}
              >
                <span style={{ fontSize: 15 }}>{selected.includes(opt) ? '☑' : '☐'}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {selected.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {selected.map((u, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.primaryL, borderRadius: 8, padding: '4px 10px', fontSize: 12 }}>
              <span style={{ color: C.primaryH }}>{u}</span>
              <button onClick={() => onChange(selected.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 13, padding: 0 }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
