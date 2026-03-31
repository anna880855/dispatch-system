import { useState, useEffect } from 'react';
import { AppProvider, useApp } from './AppContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewCase from './pages/NewCase';
import CasesList from './pages/CasesList';
import Entry from './pages/Entry';
import Admin from './pages/Admin';
import Sidebar from './components/Sidebar';
import { today, daysBetween } from './utils/helpers';
import { C } from './components/UI';

function OverdueModal({ cases, onClose, setPage }) {
  const t = today();
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(60,50,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#faf7f4', borderRadius: 22, padding: 36, maxWidth: 460, width: '90%', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}>
        <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 10 }}>⚠️</div>
        <h3 style={{ textAlign: 'center', color: C.alert, margin: '0 0 6px', fontSize: 18, fontWeight: 600 }}>照會逾期提醒</h3>
        <p style={{ textAlign: 'center', color: C.muted, fontSize: 13, margin: '0 0 20px' }}>以下案件照會超過 5 天，尚未填寫進場日期：</p>
        <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 20 }}>
          {cases.map(c => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', background: C.alertL, borderRadius: 10, marginBottom: 6, fontSize: 13 }}>
              <span><strong>{c.clientName}</strong>（{c.codeType}）{c.region ? ` ｜ ${c.region}` : ''}</span>
              <span style={{ color: C.alert, fontWeight: 600 }}>第 {daysBetween(c.referralDate, t)} 天</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => { onClose(); setPage('entry'); }} style={{ flex: 1, padding: '10px', borderRadius: 12, border: 'none', background: C.alert, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>立即前往處理</button>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 12, border: '1px solid #e4d9cf', background: '#faf7f4', color: C.text, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>稍後再說</button>
        </div>
      </div>
    </div>
  );
}

function AppLayout() {
  const { currentUser, cases } = useApp();
  const [page, setPage] = useState('dashboard');
  const [showOverdue, setShowOverdue] = useState(false);
  const t = today();

  useEffect(() => {
    if (!currentUser) return;
    const myCases = currentUser.role === 'admin' ? cases : cases.filter(c => c.managerId === currentUser.id);
    const od = myCases.filter(c => !c.entryDate && c.status !== '不承接' && daysBetween(c.referralDate, t) > 5);
    if (od.length === 0) return;
    // 每天只提醒一次（用 localStorage 記錄今天的日期+使用者）
    const storageKey = `od_reminded_${currentUser.id}_${t}`;
    if (localStorage.getItem(storageKey)) return;
    localStorage.setItem(storageKey, '1');
    setShowOverdue(true);
  }, [currentUser, cases]);

  if (!currentUser) return <Login />;

  const isAdmin = currentUser.role === 'admin';
  const myCases = isAdmin ? cases : cases.filter(c => c.managerId === currentUser.id);
  const overdueList = myCases.filter(c => !c.entryDate && c.status !== '不承接' && daysBetween(c.referralDate, t) > 5);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg, fontFamily: "'Noto Sans TC','Microsoft JhengHei',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        input, select, button, textarea { font-family: inherit; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #e4d9cf; border-radius: 3px; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
      <Sidebar page={page} setPage={setPage} />
      <main style={{ flex: 1, marginLeft: 200, padding: '32px', overflowY: 'auto', maxHeight: '100vh' }}>
        {page === 'dashboard' && <Dashboard setPage={setPage} />}
        {page === 'newCase' && <NewCase setPage={setPage} />}
        {page === 'cases' && <CasesList />}
        {page === 'entry' && <Entry />}
        {page === 'admin' && isAdmin && <Admin />}
      </main>
      {showOverdue && overdueList.length > 0 && (
        <OverdueModal cases={overdueList} onClose={() => setShowOverdue(false)} setPage={setPage} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppLayout />
    </AppProvider>
  );
}
