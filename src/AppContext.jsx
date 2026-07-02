import { createContext, useContext, useState, useEffect } from 'react';
import { fbGet, fbSet, fbUpdate, fbRemove, fbPing, objToArr, arrToObj } from './utils/firebase';
import { genId, today, daysBetween, getMonth, getManagerName } from './utils/helpers';
import { DEFAULT_ROTATING, DEFAULT_NON_ROTATING, DEFAULT_ROTATION_INDEX } from './data/units';

const AppContext = createContext(null);

const DEFAULT_USERS = [
  { id: 'u1', username: 'admin', password: 'admin123', name: '系統管理員', role: 'admin', region: null },
];

// ── Google Sheets 同步 payload / 佇列 ──
const SYNC_QUEUE_KEY = 'pendingSheetSync';

function buildSyncParams(caseData, users) {
  const entryDays = caseData.entryDate ? daysBetween(caseData.referralDate, caseData.entryDate) : '';
  const odDays = entryDays && entryDays > 5 ? entryDays - 5 : '';
  return {
    caseId: caseData.id || '',
    region: caseData.region || '', referralDate: caseData.referralDate || '',
    month: getMonth(caseData.referralDate), clientName: caseData.clientName || '',
    manager: getManagerName(users, caseData.managerId), codeType: caseData.codeType || '',
    unit: caseData.unit || '', caseType: caseData.caseType || '',
    isRotating: caseData.isRotating ? '是' : '否', referralReason: caseData.referralReason || '',
    status: caseData.status || '', rejectReason: caseData.rejectReason || '',
    entryDate: caseData.entryDate || '', odDays, overdueType: caseData.overdueType || '',
    overdueReason: caseData.overdueReason || ''
  };
}

function loadSyncQueue() {
  try { return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]'); }
  catch (e) { return []; }
}
function saveSyncQueue(q) {
  try { localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(q)); }
  catch (e) { /* storage 不可用時放棄持久化，佇列仍留在記憶體重試 */ }
}

// 用 fetch（no-cors POST）取代 Image() 打點：
// - body 放 JSON，不受 URL 長度限制
// - text/plain content-type 避免觸發 CORS preflight（Apps Script 不處理 OPTIONS）
// - 真正的網路層失敗（離線、DNS 失敗）會 reject，讓呼叫端能夠重試
async function postToSheets(url, body) {
  await fetch(url, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
  });
}

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState(DEFAULT_USERS);
  const [units, setUnits] = useState({ rotating: DEFAULT_ROTATING, nonRotating: DEFAULT_NON_ROTATING });
  const [cases, setCases] = useState([]);
  const [rotationIndex, setRotationIndex] = useState({ ...DEFAULT_ROTATION_INDEX });
  const [sheetsConfig, setSheetsConfig] = useState({ scriptUrl: '' });
  const [fbStatus, setFbStatus] = useState('connecting');
  const [ready, setReady] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(() => loadSyncQueue().length);

  useEffect(() => {
    loadFromFirebase();
    flushSyncQueue();
    window.addEventListener('online', flushSyncQueue);
    const poller = setInterval(pollCases, 15000);
    return () => {
      clearInterval(poller);
      window.removeEventListener('online', flushSyncQueue);
    };
  }, []);

  async function loadFromFirebase() {
    const timeout = (p, ms = 8000) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('timeout')), ms))]);
    const [usersRes, unitsRes, casesRes, rotRes, sheetsRes] = await Promise.allSettled([
      timeout(fbGet('users')),
      timeout(fbGet('units')),
      timeout(fbGet('cases')),
      timeout(fbGet('rotationIndex')),
      timeout(fbGet('sheetsConfig')),
    ]);

    if (usersRes.status === 'fulfilled') {
      if (usersRes.value && Object.keys(usersRes.value).length > 0) {
        const loaded = objToArr(usersRes.value);
        const hasAdmin = loaded.some(u => u.id === 'u1');
        setUsers(hasAdmin ? loaded : [...DEFAULT_USERS, ...loaded.filter(u => u.id !== 'u1')]);
      } else {
        await fbSet('users', arrToObj(DEFAULT_USERS));
      }
    }

    if (unitsRes.status === 'fulfilled') {
      if (unitsRes.value) setUnits(unitsRes.value);
      else await fbSet('units', { rotating: DEFAULT_ROTATING, nonRotating: DEFAULT_NON_ROTATING });
    }

    if (casesRes.status === 'fulfilled' && casesRes.value) setCases(objToArr(casesRes.value));

    if (rotRes.status === 'fulfilled') {
      if (rotRes.value) setRotationIndex(rotRes.value);
      else { setRotationIndex({ ...DEFAULT_ROTATION_INDEX }); await fbSet('rotationIndex', DEFAULT_ROTATION_INDEX); }
    }

    if (sheetsRes.status === 'fulfilled' && sheetsRes.value) setSheetsConfig(sheetsRes.value);

    // 只要有任一請求成功就不算離線；避免單一逾時就把整體判定拖垮
    const anySucceeded = [usersRes, unitsRes, casesRes, rotRes, sheetsRes].some(r => r.status === 'fulfilled');
    if (!anySucceeded) console.warn('Firebase 離線: 所有初始讀取皆逾時或失敗');
    setFbStatus(anySucceeded ? 'connected' : 'offline');
    setReady(true);
  }

  async function pollCases() {
    const ok = await fbPing();
    setFbStatus(ok ? 'connected' : 'offline');
    if (ok) {
      const fbCases = await fbGet('cases');
      if (fbCases) setCases(objToArr(fbCases));
    }
    flushSyncQueue();
  }

  // ── Google Sheets 同步佇列 ──
  async function syncOrQueue(url, body) {
    try {
      await postToSheets(url, body);
    } catch (e) {
      const q = loadSyncQueue();
      q.push({ url, body, ts: Date.now() });
      saveSyncQueue(q);
      setPendingSyncCount(q.length);
    }
  }

  async function flushSyncQueue() {
    const q = loadSyncQueue();
    if (!q.length) return;
    const remaining = [];
    for (const item of q) {
      try { await postToSheets(item.url, item.body); }
      catch (e) { remaining.push(item); }
    }
    saveSyncQueue(remaining);
    setPendingSyncCount(remaining.length);
  }

  // 完整同步：抓取 Firebase 目前全部案件，整批送給 Apps Script 完整覆寫三個分頁，
  // 可一次修正先前因斷線、被攔截等原因漏同步或不一致的資料
  async function fullSyncToSheets() {
    const freshConfig = await fbGet('sheetsConfig');
    const url = (freshConfig && freshConfig.scriptUrl) || sheetsConfig?.scriptUrl;
    if (!url) throw new Error('尚未設定 Apps Script 網址');
    const freshCasesRaw = await fbGet('cases');
    const list = freshCasesRaw ? objToArr(freshCasesRaw) : cases;
    const freshUsersRaw = await fbGet('users');
    const usersForNames = freshUsersRaw ? objToArr(freshUsersRaw) : users;
    const items = list.map(c => buildSyncParams(c, usersForNames));
    await postToSheets(url, { action: 'fullSync', items });
    return items.length;
  }

  // ── Auth ──
  function login(username, password) {
    const allUsers = users.length ? users : DEFAULT_USERS;
    const user = allUsers.find(u => u.username === username && u.password === password);
    if (!user) return false;
    setCurrentUser(user);
    return true;
  }
  function logout() { setCurrentUser(null); }

  // ── Cases ──
  async function addCase(caseData) {
    const newCase = { ...caseData, id: genId(), createdAt: new Date().toISOString() };
    setCases(prev => [...prev, newCase]);
    await fbSet(`cases/${newCase.id}`, newCase);
    // 直接從 Firebase 取得最新 sheetsConfig，避免 closure 抓到空值
    const freshConfig = await fbGet('sheetsConfig');
    const url = (freshConfig && freshConfig.scriptUrl) || sheetsConfig?.scriptUrl;
    if (url) {
      syncOrQueue(url, { action: 'add', ...buildSyncParams(newCase, users) });
    }
    return newCase;
  }

  async function updateCase(id, updates) {
    setCases(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    await fbUpdate(`cases/${id}`, updates);
    const updated = cases.find(c => c.id === id);
    if (updated) {
      const freshConfig = await fbGet('sheetsConfig');
      const url = (freshConfig && freshConfig.scriptUrl) || sheetsConfig?.scriptUrl;
      if (url) {
        const caseData = { ...updated, ...updates };
        syncOrQueue(url, { action: 'update', ...buildSyncParams(caseData, users) });
      }
    }
  }

  async function deleteCase(id) {
    const caseToDelete = cases.find(c => c.id === id);
    setCases(prev => prev.filter(c => c.id !== id));
    await fbRemove(`cases/${id}`);
    // 同步刪除到 Google Sheets
    // 直接從 Firebase 取得最新 sheetsConfig，避免 closure 抓到舊值
    if (caseToDelete) {
      const freshConfig = await fbGet('sheetsConfig');
      const url = freshConfig?.scriptUrl || sheetsConfig?.scriptUrl;
      if (url && caseToDelete.id) {
        syncOrQueue(url, { action: 'delete', caseId: caseToDelete.id, codeType: caseToDelete.codeType || '' });
      }
    }
  }

  // ── Users ──
  async function saveUsers(newUsers) {
    setUsers(newUsers);
    await fbSet('users', arrToObj(newUsers));
  }

  // ── Units ──
  async function saveUnits(newUnits) {
    setUnits(newUnits);
    await fbSet('units', newUnits);
  }

  // ── Rotation ──
  function getCurrentRotUnit(region, code) {
    const list = units.rotating?.[region]?.[code] || [];
    if (!list.length) return null;
    const key = `${region}_${code}`;
    const idx = rotationIndex[key] || 0;
    return { unit: list[idx % list.length], index: idx % list.length, total: list.length };
  }

  async function advanceRotation(region, code) {
    const list = units.rotating?.[region]?.[code] || [];
    if (!list.length) return;
    const key = `${region}_${code}`;
    const cur = rotationIndex[key] || 0;
    const next = (cur + 1) % list.length;
    setRotationIndex(prev => ({ ...prev, [key]: next }));
    await fbSet(`rotationIndex/${key}`, next);
  }

  async function setRotIndex(key, idx) {
    setRotationIndex(prev => ({ ...prev, [key]: idx }));
    await fbSet(`rotationIndex/${key}`, idx);
  }

  // ── Sheets ──
  async function saveSheetsConfig(cfg) {
    setSheetsConfig(cfg);
    await fbSet('sheetsConfig', cfg);
  }

  function syncToSheets(caseData, action) {
    const url = sheetsConfig?.scriptUrl;
    if (!url) return;

    if (action === 'delete') {
      syncOrQueue(url, { action: 'delete', caseId: caseData.id || '', codeType: caseData.codeType || '' });
      return;
    }

    syncOrQueue(url, { action, ...buildSyncParams(caseData, users) });
  }

  // ── Export ──
  function exportCSV(data, filename) {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const rows = [headers, ...data.map(r => headers.map(h => r[h] ?? ''))];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const uri = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv);
    const a = document.createElement('a');
    a.setAttribute('href', uri);
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  const value = {
    currentUser, users, units, cases, rotationIndex, sheetsConfig, fbStatus, ready, pendingSyncCount,
    login, logout, addCase, updateCase, deleteCase,
    saveUsers, saveUnits, saveSheetsConfig, syncToSheets, fullSyncToSheets, exportCSV,
    getCurrentRotUnit, advanceRotation, setRotIndex,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}
