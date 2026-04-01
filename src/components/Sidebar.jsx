import { C } from './UI';
import { useApp } from '../AppContext';

const NAV_ITEMS = [
  { id: 'dashboard', icon: '📊', label: '總覽' },
  { id: 'newCase', icon: '➕', label: '新增派案' },
  { id: 'cases', icon: '📋', label: '派案紀錄' },
  { id: 'entry', icon: '📅', label: '進場時效' },
];

export default function Sidebar({ page, setPage }) {
  const { currentUser, logout, fbStatus } = useApp();
  const isAdmin = currentUser?.role === 'admin';
  const items = isAdmin ? [...NAV_ITEMS, { id: 'admin', icon: '⚙️', label: '管理後台' }] : NAV_ITEMS;

  const statusDot = { connected: '#7a9e7e', offline: '#c07a62', connecting: '#c4a55a' }[fbStatus];

  return (
    <div style={{ width: 200, background: C.sidebar, display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 1100 }}>
      <div style={{ padding: '28px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#e8f0e9' }}>🌿 派案系統</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 6 }}>{currentUser?.name}</div>
        {currentUser?.region && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{currentUser.region}區</div>}
      </div>

      <nav style={{ flex: 1, padding: '16px 10px' }}>
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => setPage(item.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: page === item.id ? 'rgba(255,255,255,0.18)' : 'transparent',
              color: page === item.id ? '#fff' : 'rgba(255,255,255,0.6)',
              fontSize: 13, fontWeight: page === item.id ? 500 : 400,
              marginBottom: 2, textAlign: 'left', fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: 15 }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Firebase status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', marginBottom: 4 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusDot, flexShrink: 0, animation: fbStatus === 'connecting' ? 'pulse 1.2s infinite' : 'none' }} />
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
            {fbStatus === 'connected' ? 'Firebase 已連線' : fbStatus === 'offline' ? '離線模式' : '連線中…'}
          </span>
        </div>
        <button
          onClick={logout}
          style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'transparent', color: 'rgba(255,255,255,0.45)', fontSize: 13, fontFamily: 'inherit' }}
        >
          <span>🚪</span><span>登出</span>
        </button>
      </div>
    </div>
  );
}
