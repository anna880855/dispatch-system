import { createContext, useContext, useState, useEffect } from 'react';
import { fbGet, fbSet, fbUpdate, fbRemove, fbPing, objToArr, arrToObj } from './utils/firebase';
import { genId, today, daysBetween, getMonth, getManagerName, getCaseYear, getSheetUrl, isClosedCase, DEFAULT_HOLIDAYS, setHolidayDates } from './utils/helpers';
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
    overdueReason: caseData.overdueReason || '',
    unableToEnter: caseData.unableToEnter ? '是' : '否', unableToEnterReason: caseData.unableToEnterReason || ''
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
  const [holidays, setHolidays] = useState(DEFAULT_HOLIDAYS);
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
    const [usersRes, unitsRes, casesRes, rotRes, sheetsRes, holRes] = await Promise.allSettled([
      timeout(fbGet('users')),
      timeout(fbGet('units')),
      timeout(fbGet('cases')),
      timeout(fbGet('rotationIndex')),
      timeout(fbGet('sheetsConfig')),
      timeout(fbGet('holidays')),
    ]);

    // 放假日：Firebase 有資料就以它為準；第一次使用時寫入預設清單
    if (holRes.status === 'fulfilled') {
      if (holRes.value) applyHolidays(holRes.value);
      else await fbSet('holidays', DEFAULT_HOLIDAYS);
    }

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

  // 取得最新的 sheetsConfig（直接讀 Firebase，避免 closure 抓到舊值）
  async function freshSheetsConfig() {
    return (await fbGet('sheetsConfig')) || sheetsConfig;
  }

  // 完整同步（依年度）：該年度全部案件（含已封存）整批送給該年度的 Apps Script，
  // 完整覆寫三個分頁，可修正先前漏同步或不一致的資料
  async function fullSyncToSheets(year) {
    const url = getSheetUrl(await freshSheetsConfig(), year);
    if (!url) throw new Error(`尚未設定 ${year} 年的 Apps Script 網址`);
    const freshCasesRaw = await fbGet('cases');
    const active = freshCasesRaw ? objToArr(freshCasesRaw) : cases;
    const archivedRaw = await fbGet(`archive/${year}/cases`);
    const archived = archivedRaw ? objToArr(archivedRaw) : [];
    const list = [...active.filter(c => getCaseYear(c) === year), ...archived];
    const freshUsersRaw = await fbGet('users');
    const usersForNames = freshUsersRaw ? objToArr(freshUsersRaw) : users;
    const items = list.map(c => buildSyncParams(c, usersForNames));
    await postToSheets(url, { action: 'fullSync', items });
    return items.length;
  }

  // 年度封存：把指定年度「已結束」的案件從 cases 移到 archive/{year}/cases。
  // 執行前先下載 cases 完整備份；未結束的案件保留，處理完可再執行一次。
  async function archiveYear(year) {
    if (year >= today().slice(0, 4)) throw new Error('只能封存今年以前的年度');
    const freshCasesRaw = await fbGet('cases');
    if (!freshCasesRaw) throw new Error('無法讀取案件資料，請確認連線後再試');
    const all = objToArr(freshCasesRaw);
    const yearCases = all.filter(c => getCaseYear(c) === year);
    const toArchive = yearCases.filter(isClosedCase);
    const remaining = yearCases.filter(c => !isClosedCase(c));
    if (!toArchive.length) return { archived: 0, remaining };

    downloadJSON(freshCasesRaw, `派案系統備份_封存${year}前_${today()}.json`);

    // 單次多路徑更新：寫入封存與刪除 cases 同時成功或同時失敗
    const updates = {};
    toArchive.forEach(c => {
      updates[`archive/${year}/cases/${c.id}`] = c;
      updates[`cases/${c.id}`] = null;
    });
    const res = await fbUpdate('', updates);
    if (res === null) throw new Error('寫入 Firebase 失敗，資料未變動');

    const ids = new Set(toArchive.map(c => c.id));
    setCases(prev => prev.filter(c => !ids.has(c.id)));
    return { archived: toArchive.length, remaining };
  }

  async function getArchivedCount(year) {
    const r = await fbGet(`archive/${year}/cases`);
    return r ? Object.keys(r).length : 0;
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
    const url = getSheetUrl(await freshSheetsConfig(), getCaseYear(newCase));
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
      const cfg = await freshSheetsConfig();
      const caseData = { ...updated, ...updates };
      const oldYear = getCaseYear(updated);
      const newYear = getCaseYear(caseData);
      // 照會日改到另一個年度：先從舊年度的 Sheet 移除
      if (oldYear !== newYear) {
        const oldUrl = getSheetUrl(cfg, oldYear);
        if (oldUrl) syncOrQueue(oldUrl, { action: 'delete', caseId: updated.id, codeType: updated.codeType || '' });
      }
      const url = getSheetUrl(cfg, newYear);
      if (url) {
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
      const url = getSheetUrl(await freshSheetsConfig(), getCaseYear(caseToDelete));
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

  // ── 放假日 ──
  function applyHolidays(obj) {
    setHolidayDates(Object.keys(obj));
    setHolidays(obj);
  }
  async function addHoliday(date, note) {
    const next = { ...holidays, [date]: note };
    applyHolidays(next);
    await fbSet(`holidays/${date}`, note);
  }
  async function removeHoliday(date) {
    const next = { ...holidays };
    delete next[date];
    applyHolidays(next);
    await fbRemove(`holidays/${date}`);
  }

  // ── Sheets ──
  async function saveSheetsConfig(cfg) {
    setSheetsConfig(cfg);
    await fbSet('sheetsConfig', cfg);
  }

  function syncToSheets(caseData, action, urlOverride) {
    const url = urlOverride || getSheetUrl(sheetsConfig, getCaseYear(caseData));
    if (!url) return;

    if (action === 'delete') {
      syncOrQueue(url, { action: 'delete', caseId: caseData.id || '', codeType: caseData.codeType || '' });
      return;
    }

    syncOrQueue(url, { action, ...buildSyncParams(caseData, users) });
  }

  // ── Export ──
  function downloadJSON(obj, filename) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

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

  // 今年尚未設定 Sheet 網址時提醒（新案件將無法同步）
  const currentYear = today().slice(0, 4);
  const missingSheetYear = ready && !getSheetUrl(sheetsConfig, currentYear) ? currentYear : null;

  const value = {
    missingSheetYear, archiveYear, getArchivedCount, holidays, addHoliday, removeHoliday,
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
