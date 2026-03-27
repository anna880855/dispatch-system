import { useState } from 'react';
import { useApp } from '../AppContext';
import { C } from '../components/UI';

export default function Login() {
  const { login } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    await new Promise(r => setTimeout(r, 200));
    if (!login(username, password)) setError('帳號或密碼錯誤，請再試一次');
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(145deg,#f0ebe4 0%,#e8dfd6 60%,#ddd5cc 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Noto Sans TC','Microsoft JhengHei',sans-serif" }}>
      <div style={{ background: '#faf7f4', borderRadius: 24, padding: '48px 44px', width: 400, boxShadow: '0 12px 48px rgba(74,68,58,0.14)', border: '1px solid #e4d9cf' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 60, height: 60, background: '#dce8dd', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 26 }}>🌿</div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: C.text, margin: 0 }}>個管派案系統</h1>
          <p style={{ color: C.muted, fontSize: 13, margin: '6px 0 0' }}>長照服務管理平台</p>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 500 }}>帳號</label>
          <input value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} placeholder="請輸入帳號"
            style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #e4d9cf', background: '#f0ebe4', fontSize: 13, color: C.text, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
        </div>
        <div style={{ marginBottom: 28 }}>
          <label style={{ display: 'block', fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 500 }}>密碼</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} placeholder="請輸入密碼"
            style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #e4d9cf', background: '#f0ebe4', fontSize: 13, color: C.text, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
        </div>
        {error && <div style={{ color: C.alert, fontSize: 13, marginBottom: 16, textAlign: 'center', background: C.alertL, padding: '8px 12px', borderRadius: 8 }}>{error}</div>}
        <button onClick={handleLogin} disabled={loading}
          style={{ width: '100%', padding: '10px 24px', borderRadius: 12, border: 'none', background: C.primary, color: '#fff', fontWeight: 600, cursor: loading ? 'default' : 'pointer', fontSize: 14, fontFamily: 'inherit', opacity: loading ? 0.7 : 1 }}>
          {loading ? '登入中…' : '登入'}
        </button>
      </div>
    </div>
  );
}
