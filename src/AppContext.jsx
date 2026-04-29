import { createContext, useContext, useState, useEffect } from 'react';
import { fbGet, fbSet, fbUpdate, fbRemove, objToArr, arrToObj } from './utils/firebase';
import { genId, today, daysBetween, getMonth, getManagerName } from './utils/helpers';
import { DEFAULT_ROTATING, DEFAULT_NON_ROTATING, DEFAULT_ROTATION_INDEX } from './data/units';

const AppContext = createContext(null);

const DEFAULT_USERS = [
  { id: 'u1', username: 'admin', password: 'admin123', name: '系統管理員', role: 'admin', region: null },
];

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState(DEFAULT_USERS);
  const [units, setUnits] = useState({ rotating: DEFAULT_ROTATING, nonRotating: DEFAULT_NON_ROTATING });
  const [cases, setCases] = useState([]);
  const [rotationIndex, setRotationIndex] = useState({ ...DEFAULT_ROTATION_INDEX });
  const [sheetsConfig, setSheetsConfig] = useState({ scriptUrl: '' });
  const [fbStatus, setFbStatus] = useState('connecting');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadFromFirebase();
    const poller = setInterval(pollCases, 15000);
    return () => clearInterval(poller);
  }, []);

  async function loadFromFirebase() {
    try {
      const timeout = (p, ms = 8000) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('timeout')), ms))]);
      const [fbUsers, fbUnits, fbCases, fbRot, fbSheets] = await Promise.all([
        timeout(fbGet('users')),
        timeout(fbGet('units')),
        timeout(fbGet('cases')),
        timeout(fbGet('rotationIndex')),
        timeout(fbGet('sheetsConfig')),
      ]);

      if (fbUsers && Object.keys(fbUsers).length > 0) {
        const loaded = objToArr(fbUsers);
        const hasAdmin = loaded.some(u => u.id === 'u1');
        setUsers(hasAdmin ? loaded : [...DEFAULT_USERS, ...loaded.filter(u => u.id !== 'u1')]);
      } else {
        await fbSet('users', arrToObj(DEFAULT_USERS));
      }

      if (fbUnits) setUnits(fbUnits);
      else await fbSet('units', { rotating: DEFAULT_ROTATING, nonRotating: DEFAULT_NON_ROTATING });

      if (fbCases) setCases(objToArr(fbCases));

      if (fbRot) setRotationIndex(fbRot);
      else { setRotationIndex({ ...DEFAULT_ROTATION_INDEX }); await fbSet('rotationIndex', DEFAULT_ROTATION_INDEX); }

      if (fbSheets) setSheetsConfig(fbSheets);

      setFbStatus('connected');
    } catch (e) {
      console.warn('Firebase 離線:', e.message);
      setFbStatus('offline');
    }
    setReady(true);
  }

  async function pollCases() {
    try {
      const fbCases = await fbGet('cases');
      if (fbCases) setCases(objToArr(fbCases));
    } catch (e) { /* silent */ }
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
    syncToSheets(newCase, 'add');
    return newCase;
  }

  async function updateCase(id, updates) {
    setCases(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    await fbUpdate(`cases/${id}`, updates);
    const updated = cases.find(c => c.id === id);
    if (updated) syncToSheets({ ...updated, ...updates }, 'update');
  }

  async function deleteCase(id) {
    const caseToDelete = cases.find(c => c.id === id);
    setCases(prev => prev.filter(c => c.id !== id));
    await fbRemove(`cases/${id}`);
    // 同步刪除到 Google Sheets
    if (caseToDelete) syncToSheets(caseToDelete, 'delete');
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
      // 刪除只需要 caseId 和 codeType
      const params = {
        action: 'delete',
        caseId: caseData.id || '',
        codeType: caseData.codeType || '',
      };
      const qs = Object.keys(params).map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
      const img = new Image();
      img.src = `${url}?${qs}`;
      return;
    }

    const entryDays = caseData.entryDate ? daysBetween(caseData.referralDate, caseData.entryDate) : '';
    const odDays = entryDays && entryDays > 5 ? entryDays - 5 : '';
    const params = {
      action, caseId: caseData.id || '',
      region: caseData.region || '', referralDate: caseData.referralDate || '',
      month: getMonth(caseData.referralDate), clientName: caseData.clientName || '',
      manager: getManagerName(users, caseData.managerId), codeType: caseData.codeType || '',
      unit: caseData.unit || '', caseType: caseData.caseType || '',
      isRotating: caseData.isRotating ? '是' : '否', referralReason: caseData.referralReason || '',
      status: caseData.status || '', rejectReason: caseData.rejectReason || '',
      entryDate: caseData.entryDate || '', odDays, overdueType: caseData.overdueType || '',
      overdueReason: caseData.overdueReason || ''
    };
    const qs = Object.keys(params).map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
    const img = new Image();
    img.src = `${url}?${qs}`;
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
    currentUser, users, units, cases, rotationIndex, sheetsConfig, fbStatus, ready,
    login, logout, addCase, updateCase, deleteCase,
    saveUsers, saveUnits, saveSheetsConfig, syncToSheets, exportCSV,
    getCurrentRotUnit, advanceRotation, setRotIndex,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}
