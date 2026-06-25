import { useState } from 'react';
import { useApp } from '../AppContext';
import { today, daysBetween, getMonth, getManagerName, REGIONS, ROTATING_CODES, CODE_TYPES, genId } from '../utils/helpers';
import { Card, PageHeader, Tab, FormField, Input, Select, BtnPrimary, BtnSecondary, BtnSmall, Alert, Badge, C } from '../components/UI';

export default function Admin() {
  const [tab, setTab] = useState('accounts');
  const tabs = [
    { id: 'accounts', label: '👤 帳號管理' },
    { id: 'rotating', label: '🔄 輪派單位' },
    { id: 'rotationStatus', label: '📍 輪派進度' },
    { id: 'nonRotating', label: '📌 特約單位' },
    { id: 'export', label: '📤 匯出資料' },
    { id: 'import', label: '📥 匯入舊資料' },
    { id: 'sheets', label: '📊 Google Sheets' },
  ];

  return (
    <div>
      <PageHeader title="管理員後台" subtitle="帳號管理、單位設定、資料匯出" />
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {tabs.map(t => <Tab key={t.id} id={t.id} label={t.label} active={tab === t.id} onClick={setTab} />)}
      </div>
      {tab === 'accounts' && <AccountsTab />}
      {tab === 'rotating' && <RotatingTab />}
      {tab === 'rotationStatus' && <RotationStatusTab />}
      {tab === 'nonRotating' && <NonRotatingTab />}
      {tab === 'export' && <ExportTab />}
      {tab === 'import' && <ImportTab />}
    {tab === 'sheets' && <SheetsTab />}
    </div>
  );
}

function AccountsTab() {
  const { users, saveUsers } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [nu, setNu] = useState({ username: '', password: '', name: '', role: 'manager', region: '三重' });
  const [editForm, setEditForm] = useState({});
  const [msg, setMsg] = useState(null);

  async function addUser() {
    if (!nu.username.trim() || !nu.password || !nu.name.trim()) { setMsg({ type: 'error', text: '請填寫所有欄位' }); return; }
    if (users.find(u => u.username === nu.username)) { setMsg({ type: 'error', text: '此帳號名稱已存在' }); return; }
    await saveUsers([...users, { ...nu, id: genId() }]);
    setNu({ username: '', password: '', name: '', role: 'manager', region: '三重' });
    setShowAdd(false);
    setMsg({ type: 'success', text: '✓ 帳號已新增' });
  }

  function startEdit(u) {
    setEditingId(u.id);
    setEditForm({ ...u });
    setShowAdd(false);
  }

  async function saveEdit() {
    if (!editForm.name.trim() || !editForm.username.trim() || !editForm.password) {
      setMsg({ type: 'error', text: '姓名、帳號、密碼不能為空' }); return;
    }
    const dup = users.find(u => u.username === editForm.username && u.id !== editingId);
    if (dup) { setMsg({ type: 'error', text: '此帳號名稱已被使用' }); return; }
    await saveUsers(users.map(u => u.id === editingId ? { ...u, ...editForm } : u));
    setEditingId(null);
    setMsg({ type: 'success', text: '✓ 帳號已更新' });
  }

  async function removeUser(id) {
    if (!window.confirm('確定要刪除此帳號？')) return;
    await saveUsers(users.filter(u => u.id !== id));
  }

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>帳號管理（共 {users.length} 位）</h3>
        <BtnSmall onClick={() => { setShowAdd(v => !v); setEditingId(null); }} style={{ background: C.primary, color: '#fff', border: 'none' }}>＋ 新增帳號</BtnSmall>
      </div>
      {msg && <Alert type={msg.type}>{msg.text}</Alert>}

      {/* 新增表單 */}
      {showAdd && (
        <div style={{ background: C.bg, borderRadius: 12, padding: 20, marginBottom: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="姓名"><Input value={nu.name} onChange={e => setNu(f => ({ ...f, name: e.target.value }))} placeholder="顯示姓名" /></FormField>
          <FormField label="帳號"><Input value={nu.username} onChange={e => setNu(f => ({ ...f, username: e.target.value }))} placeholder="登入帳號" /></FormField>
          <FormField label="密碼"><Input type="password" value={nu.password} onChange={e => setNu(f => ({ ...f, password: e.target.value }))} placeholder="登入密碼" /></FormField>
          <FormField label="角色">
            <Select value={nu.role} onChange={e => setNu(f => ({ ...f, role: e.target.value }))}>
              <option value="manager">個管師</option><option value="admin">管理員</option>
            </Select>
          </FormField>
          {nu.role === 'manager' && (
            <FormField label="服務區域">
              <Select value={nu.region} onChange={e => setNu(f => ({ ...f, region: e.target.value }))}>
                {REGIONS.map(r => <option key={r}>{r}</option>)}
              </Select>
            </FormField>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <BtnSmall onClick={addUser} style={{ background: C.success, color: '#fff', border: 'none' }}>儲存</BtnSmall>
            <BtnSmall onClick={() => setShowAdd(false)}>取消</BtnSmall>
          </div>
        </div>
      )}

      {/* 帳號列表 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {users.map(u => (
          <div key={u.id}>
            {/* 一般顯示列 */}
            {editingId !== u.id && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: C.bg, borderRadius: 12, border: `1px solid ${C.border}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{u.name}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                    帳號：{u.username}　｜　{u.role === 'admin' ? '管理員' : `個管師・${u.region || '—'}區`}
                  </div>
                </div>
                <Badge color={u.role === 'admin' ? 'alert' : 'primary'}>{u.role === 'admin' ? '管理員' : '個管師'}</Badge>
                <BtnSmall onClick={() => startEdit(u)} style={{ fontSize: 11 }}>✏️ 修改</BtnSmall>
                {u.id !== 'u1' && (
                  <BtnSmall onClick={() => removeUser(u.id)} style={{ color: C.alert, background: C.alertL, border: 'none', fontSize: 11 }}>刪除</BtnSmall>
                )}
              </div>
            )}

            {/* 編輯列 */}
            {editingId === u.id && (
              <div style={{ background: C.primaryL, borderRadius: 12, padding: 20, border: `1px solid ${C.primary}` }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.primaryH, marginBottom: 14 }}>✏️ 修改帳號：{u.name}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <FormField label="姓名">
                    <Input value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                  </FormField>
                  <FormField label="帳號">
                    <Input value={editForm.username || ''} onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))} />
                  </FormField>
                  <FormField label="新密碼">
                    <Input type="password" value={editForm.password || ''} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} placeholder="輸入新密碼" />
                  </FormField>
                  <FormField label="角色">
                    <Select value={editForm.role || 'manager'} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                      <option value="manager">個管師</option>
                      <option value="admin">管理員</option>
                    </Select>
                  </FormField>
                  {editForm.role === 'manager' && (
                    <FormField label="服務區域">
                      <Select value={editForm.region || '三重'} onChange={e => setEditForm(f => ({ ...f, region: e.target.value }))}>
                        {REGIONS.map(r => <option key={r}>{r}</option>)}
                      </Select>
                    </FormField>
                  )}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <BtnSmall onClick={saveEdit} style={{ background: C.primary, color: '#fff', border: 'none' }}>儲存變更</BtnSmall>
                    <BtnSmall onClick={() => setEditingId(null)}>取消</BtnSmall>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

function RotatingTab() {
  const { units, saveUnits } = useApp();
  const [region, setRegion] = useState('三重');
  const [code, setCode] = useState('BA');
  const [newUnit, setNewUnit] = useState('');
  const list = units.rotating?.[region]?.[code] || [];

  async function add() {
    if (!newUnit.trim()) return;
    const u = { ...units, rotating: { ...units.rotating, [region]: { ...units.rotating[region], [code]: [...list, newUnit.trim()] } } };
    await saveUnits(u); setNewUnit('');
  }
  async function remove(idx) {
    const u = { ...units, rotating: { ...units.rotating, [region]: { ...units.rotating[region], [code]: list.filter((_, i) => i !== idx) } } };
    await saveUnits(u);
  }
  async function move(idx, dir) {
    const target = idx + dir;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    [next[idx], next[target]] = [next[target], next[idx]];
    const u = { ...units, rotating: { ...units.rotating, [region]: { ...units.rotating[region], [code]: next } } };
    await saveUnits(u);
  }

  return (
    <Card>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>輪派單位設定（各區 BA / DA01）</h3>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>用 ▲▼ 調整順序，順序會直接影響輪派進度（一般使用者可在「輪派順序」頁面查看，但僅管理員可調整）</p>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {REGIONS.map(r => <Tab key={r} id={r} label={`${r}區`} active={region === r} onClick={setRegion} />)}
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {ROTATING_CODES.map(c => <Tab key={c} id={c} label={`${c}碼`} active={code === c} onClick={setCode} />)}
      </div>
      <div style={{ marginBottom: 14 }}>
        {list.length === 0 ? <div style={{ color: C.muted, fontSize: 13, padding: '10px 0' }}>尚未設定輪派單位</div>
          : list.map((u, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px', background: C.bg, borderRadius: 10, marginBottom: 6, border: `1px solid ${C.border}` }}>
              <span style={{ color: C.muted, fontSize: 12, width: 28, textAlign: 'center' }}>{i + 1}</span>
              <span style={{ flex: 1, fontSize: 13 }}>{u}</span>
              <button onClick={() => move(i, -1)} disabled={i === 0} style={{ background: 'none', border: 'none', color: i === 0 ? C.border : C.muted, cursor: i === 0 ? 'default' : 'pointer', fontSize: 14, padding: 4 }}>▲</button>
              <button onClick={() => move(i, 1)} disabled={i === list.length - 1} style={{ background: 'none', border: 'none', color: i === list.length - 1 ? C.border : C.muted, cursor: i === list.length - 1 ? 'default' : 'pointer', fontSize: 14, padding: 4 }}>▼</button>
              <button onClick={() => remove(i)} style={{ background: 'none', border: 'none', color: C.alert, cursor: 'pointer', fontSize: 14, padding: 4 }}>✕</button>
            </div>
          ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Input value={newUnit} onChange={e => setNewUnit(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="輸入單位全名" style={{ flex: 1 }} />
        <BtnSmall onClick={add} style={{ background: C.primary, color: '#fff', border: 'none', whiteSpace: 'nowrap' }}>新增</BtnSmall>
      </div>
    </Card>
  );
}

function RotationStatusTab() {
  const { units, rotationIndex, setRotIndex } = useApp();
  const rows = REGIONS.flatMap(r => ROTATING_CODES.map(c => {
    const list = units.rotating?.[r]?.[c] || [];
    if (!list.length) return null;
    const key = `${r}_${c}`;
    const idx = rotationIndex[key] || 0;
    const cur = list[idx % list.length];
    const next = list[(idx + 1) % list.length];
    return { region: r, code: c, cur, next, idx: (idx % list.length) + 1, total: list.length, key };
  }).filter(Boolean));

  return (
    <Card>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>輪派進度管理</h3>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>查看各區目前輪派到哪一間，可手動調整</p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ background: C.bg }}>{['區域', '碼別', '目前輪派', '下一間', '進度', '操作'].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: C.muted, fontWeight: 500, fontSize: 12, borderBottom: `1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.key} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: '10px 14px', fontWeight: 500 }}>{r.region}</td>
                <td style={{ padding: '10px 14px' }}><Badge>{r.code}</Badge></td>
                <td style={{ padding: '10px 14px', color: C.warning, fontWeight: 500, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.cur}>{r.cur}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: C.muted, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.next}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: C.muted }}>{r.idx} / {r.total}</td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <BtnSmall style={{ fontSize: 11 }} onClick={() => setRotIndex(r.key, r.idx % r.total)}>跳過 ▶</BtnSmall>
                    <BtnSmall style={{ fontSize: 11, color: C.alert, background: C.alertL, border: 'none' }} onClick={() => { if (window.confirm('重設回第1號？')) setRotIndex(r.key, 0); }}>重設 ↺</BtnSmall>
                    <input type="number" min="1" max={r.total} defaultValue={r.idx} onBlur={e => setRotIndex(r.key, Math.max(0, Math.min(parseInt(e.target.value) - 1 || 0, r.total - 1)))}
                      style={{ width: 54, padding: '4px 6px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 11, textAlign: 'center', fontFamily: 'inherit' }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function NonRotatingTab() {
  const { units, saveUnits } = useApp();
  const [code, setCode] = useState('BA');
  const [newUnit, setNewUnit] = useState('');
  const nonCodes = CODE_TYPES; // 所有碼別都可設定特約單位，包含 DA01
  const list = units.nonRotating?.[code] || [];

  async function add() {
    if (!newUnit.trim()) return;
    const u = { ...units, nonRotating: { ...units.nonRotating, [code]: [...list, newUnit.trim()] } };
    await saveUnits(u); setNewUnit('');
  }
  async function remove(idx) {
    const u = { ...units, nonRotating: { ...units.nonRotating, [code]: list.filter((_, i) => i !== idx) } };
    await saveUnits(u);
  }
  async function importCSV(e) {
    const file = e.target.files[0]; if (!file) return;
    const text = await file.text();
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(function(l){ return l.trim(); });
    if (lines.length < 2) { alert('檔案內容為空或格式錯誤'); return; }
    const headers = lines[0].split(',').map(function(h){ return h.trim().replace(/"/g, ''); });
    const codes = ['BA', 'BB', 'BC', 'CA', 'CB', 'CC', 'CD', 'DA01', 'BA09', 'GA', 'SC'];
    const colMap = {};
    headers.forEach(function(h, i){ if (codes.includes(h)) colMap[i] = h; });
    if (!Object.keys(colMap).length) { alert('找不到有效表頭，請確認欄位名稱（BA,BB,BC,CA,CB,CC,CD,DA01,BA09,GA,SC）'); return; }
    const newData = Object.assign({}, units.nonRotating);
    codes.forEach(function(c){ newData[c] = []; });
    lines.slice(1).forEach(function(line){
      const cols = line.split(',');
      Object.entries(colMap).forEach(function([idx, code]){
        const val = (cols[idx] || '').trim().replace(/"/g, '');
        if (val) newData[code].push(val);
      });
    });
    await saveUnits(Object.assign({}, units, { nonRotating: newData }));
    alert('✅ 匯入成功！共匯入 ' + codes.map(function(c){ return c + ':' + (newData[c]||[]).length + '筆'; }).filter(function(s){ return s.indexOf(':0') === -1; }).join('、'));
  }

  return (
    <Card>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>特約單位設定（全區共用）</h3>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>依碼別設定特約單位</p>
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {nonCodes.map(c => <Tab key={c} id={c} label={c} active={code === c} onClick={setCode} />)}
      </div>
      <div style={{ marginBottom: 14 }}>
        {list.length === 0 ? <div style={{ color: C.muted, fontSize: 13, padding: '10px 0' }}>尚未設定特約單位</div>
          : list.map((u, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px', background: C.bg, borderRadius: 10, marginBottom: 6, border: `1px solid ${C.border}` }}>
              <span style={{ color: C.muted, fontSize: 12, width: 28, textAlign: 'center' }}>{i + 1}</span>
              <span style={{ flex: 1, fontSize: 13 }}>{u}</span>
              <button onClick={() => remove(i)} style={{ background: 'none', border: 'none', color: C.alert, cursor: 'pointer', fontSize: 14, padding: 4 }}>✕</button>
            </div>
          ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <Input value={newUnit} onChange={e => setNewUnit(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="輸入特約單位全名" style={{ flex: 1 }} />
        <BtnSmall onClick={add} style={{ background: C.primary, color: '#fff', border: 'none', whiteSpace: 'nowrap' }}>新增</BtnSmall>
      </div>
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>📥 批次匯入 CSV</div>
        <p style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>表頭格式：BA,BB,BC,CA,CB,CC,CD,DA01,BA09,GA,SC</p>
        <label style={{ display: 'inline-block', padding: '6px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, cursor: 'pointer', fontSize: 12 }}>
          📂 上傳 CSV<input type="file" accept=".csv" style={{ display: 'none' }} onChange={importCSV} />
        </label>
      </div>
    </Card>
  );
}

function ExportTab() {
  const { cases, users } = useApp();
  const t = today();
  const [month, setMonth] = useState('');
  const [code, setCode] = useState('');

  const filtered = cases.filter(c => {
    if (month && !c.referralDate?.startsWith(month)) return false;
    if (code && c.codeType !== code) return false;
    return true;
  });

  function buildRow(c, type) {
    const days = c.entryDate ? daysBetween(c.referralDate, c.entryDate) : '';
    const od = days && days > 5 ? days - 5 : '';
    const mgr = getManagerName(users, c.managerId);
    const mon = getMonth(c.referralDate);
    if (type === 'BA') return { 服務區域: c.region, 派案日期: c.referralDate, 派案月份: mon, 個案姓名: c.clientName, 個管人員: mgr, 服務碼別: c.codeType, 派案單位: c.unit, 新舊案: c.caseType, 是否為輪派: c.isRotating ? '是' : '否', 派案原因: c.referralReason, 承接狀態: c.status, 未承接原因: c.rejectReason, 進場日: c.entryDate, 逾期進場天數: od, 逾期因素: c.overdueType, 逾期原因: c.overdueReason, 案件ID: c.id || '' };
    if (type === 'DA01') return { 服務區域: c.region, 派案日期: c.referralDate, 派車月份: mon, 個案姓名: c.clientName, 派車單位: c.unit, 個管人員: mgr, 是否為輪派: c.isRotating ? '是' : '否', 案件ID: c.id || '' };
    return { 服務區域: c.region, 派案日期: c.referralDate, 派案月份: mon, 個案姓名: c.clientName, 個管人員: mgr, 派案碼別: c.codeType, 派案單位: c.unit, 承接狀態: c.status, 未承接原因: c.rejectReason, 進場日: c.entryDate, 逾期進場天數: od, 逾期因素: c.overdueType, 逾期原因: c.overdueReason, 案件ID: c.id || '' };
  }

  function dlCSV(rows, filename) {
    if (!rows.length) return;
    const hs = Object.keys(rows[0]);
    const csv = [hs, ...rows.map(r => hs.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`))].map(r => r.join ? r.join(',') : r).join('\n');
    const a = document.createElement('a');
    a.setAttribute('href', 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv));
    a.setAttribute('download', filename);
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  function exportByCode(grp) {
    const data = cases.filter(c => grp === 'BA' ? c.codeType === 'BA' : grp === 'DA01' ? c.codeType === 'DA01' : ['BB', 'BC', 'CA', 'CB', 'CC', 'CD', 'BA09', 'GA', 'SC'].includes(c.codeType));
    const name = grp === 'BA' ? 'BA碼派案紀錄' : grp === 'DA01' ? '交通車派案紀錄' : '非輪派單位照會紀錄';
    dlCSV(data.map(c => buildRow(c, grp)), `${name}_${t}.csv`);
  }

  function dlAll() {
    const t = today();
    const rows = cases.map(c => ({
      服務區域: c.region||'', 派案日期: c.referralDate||'', 派案月份: getMonth(c.referralDate),
      個案姓名: c.clientName||'', 個管人員: getManagerName(users, c.managerId),
      服務碼別: c.codeType||'', 派案單位: c.unit||'', 新舊案: c.caseType||'',
      是否為輪派: c.isRotating?'是':'否', 派案原因: c.referralReason||'',
      承接狀態: c.status||'', 未承接原因: c.rejectReason||'',
      進場日: c.entryDate||'',
      逾期進場天數: c.entryDate&&daysBetween(c.referralDate,c.entryDate)>5 ? daysBetween(c.referralDate,c.entryDate)-5 : '',
      逾期因素: c.overdueType||'', 逾期原因: c.overdueReason||'',
    }));
    dlCSV(rows, '全部派案紀錄_'+t+'.csv');
  }

  return (
    <Card>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>資料匯出</h3>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>匯出 CSV，可直接匯入 Google Sheets 或 Excel</p>

      {/* 下載全部 */}
      <div style={{ background: C.primaryL, borderRadius: 12, padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: C.primaryH }}>📋 下載全部派案名單</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>共 {cases.length} 筆，包含所有碼別、所有個管師、所有月份</div>
        </div>
        <BtnPrimary onClick={dlAll}>⬇ 下載全部</BtnPrimary>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <Input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ width: 150 }} />
        <Select value={code} onChange={e => setCode(e.target.value)} style={{ width: 130 }}>
          <option value="">全部碼別</option>
          {CODE_TYPES.map(c => <option key={c}>{c}</option>)}
        </Select>
      </div>
      <div style={{ background: C.bg, borderRadius: 12, padding: 14, marginBottom: 20, fontSize: 13 }}>篩選結果：<strong>{filtered.length}</strong> 筆</div>
      <BtnPrimary onClick={() => dlCSV(filtered.map(c => buildRow(c, c.codeType === 'DA01' ? 'DA01' : c.codeType === 'BA' ? 'BA' : 'non')), `派案紀錄_${month || t}.csv`)} style={{ marginBottom: 24 }}>⬇ 匯出 CSV</BtnPrimary>
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>依分頁匯出</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[['BA', 'BA碼派案紀錄'], ['non', '非輪派照會紀錄'], ['DA01', '交通車（DA01）']].map(([g, l]) => (
            <BtnSecondary key={g} onClick={() => exportByCode(g)} style={{ fontSize: 12 }}>⬇ {l}</BtnSecondary>
          ))}
        </div>
      </div>
    </Card>
  );
}

function ImportTab() {
  const { addCase, cases } = useApp();
  const [results, setResults] = useState(null);
  const [importing, setImporting] = useState(false);

  async function handleImport(e, sheetType) {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    setResults(null);

    try {
      const text = await file.text();
      const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(function(l){ return l.trim(); });
      if (lines.length < 2) { setResults({ error: '檔案內容為空或格式錯誤' }); setImporting(false); return; }

      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const rows = lines.slice(1).map(line => {
        const cols = [];
        let cur = '', inQ = false;
        for (let i = 0; i < line.length; i++) {
          if (line[i] === '"') { inQ = !inQ; }
          else if (line[i] === ',' && !inQ) { cols.push(cur); cur = ''; }
          else cur += line[i];
        }
        cols.push(cur);
        const obj = {};
        headers.forEach((h, i) => { obj[h] = (cols[i] || '').trim(); });
        return obj;
      }).filter(r => r['個案姓名'] || r['案件ID']);

      let added = 0, skipped = 0;
      const existingIds = new Set(cases.map(c => c.id));

      for (const row of rows) {
        const caseId = row['案件ID'] || '';
        // 跳過已存在的
        if (caseId && existingIds.has(caseId)) { skipped++; continue; }

        let caseData = {};
        if (sheetType === 'BA') {
          caseData = {
            id: caseId || genId(),
            region: row['服務區域'] || '',
            referralDate: row['派案日期'] || '',
            clientName: row['個案姓名'] || '',
            managerId: '',
            codeType: row['服務碼別'] || 'BA',
            unit: row['派案單位'] || '',
            caseType: row['新舊案'] || '新案',
            isRotating: row['是否為輪派'] === '是',
            referralReason: row['派案原因'] || '',
            status: row['承接狀態'] || '承接',
            rejectReason: row['未承接原因'] || '',
            entryDate: row['進場日'] || '',
            overdueType: row['逾期因素'] || '',
            overdueReason: row['逾期原因'] || '',
            createdAt: new Date().toISOString(),
            importedFromSheets: true,
          };
        } else if (sheetType === 'DA01') {
          caseData = {
            id: caseId || genId(),
            region: row['服務區域'] || '',
            referralDate: row['派案日期'] || '',
            clientName: row['個案姓名'] || '',
            managerId: '',
            codeType: 'DA01',
            unit: row['派車單位'] || '',
            caseType: '新案',
            isRotating: row['是否為輪派'] === '是',
            status: '承接',
            createdAt: new Date().toISOString(),
            importedFromSheets: true,
          };
        } else {
          caseData = {
            id: caseId || genId(),
            region: row['服務區域'] || '',
            referralDate: row['派案日期'] || '',
            clientName: row['個案姓名'] || '',
            managerId: '',
            codeType: row['派案碼別'] || '',
            unit: row['派案單位'] || '',
            caseType: '新案',
            isRotating: false,
            status: row['承接狀態'] || '承接',
            rejectReason: row['未承接原因'] || '',
            entryDate: row['進場日'] || '',
            overdueType: row['逾期因素'] || '',
            overdueReason: row['逾期原因'] || '',
            createdAt: new Date().toISOString(),
            importedFromSheets: true,
          };
        }

        await addCase(caseData);
        added++;
      }

      setResults({ added, skipped, total: rows.length });
    } catch (err) {
      setResults({ error: '匯入失敗：' + err.message });
    }
    setImporting(false);
    e.target.value = '';
  }

  return (
    <Card>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>📥 匯入舊資料</h3>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>
        從 Google Sheets 匯出 CSV 後上傳，自動補入 Firebase。已存在的案件（依案件ID判斷）會自動跳過。
      </p>

      <div style={{ background: C.accentL, borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 12, color: C.accent }}>
        <strong>步驟：</strong><br />
        1. Google Sheets → 對應分頁 → 檔案 → 下載 → CSV<br />
        2. 在下方對應的分頁上傳該 CSV 檔案
      </div>

      {results && (
        <Alert type={results.error ? 'error' : 'success'}>
          {results.error || `✓ 匯入完成！新增 ${results.added} 筆，跳過已存在 ${results.skipped} 筆，共處理 ${results.total} 筆`}
        </Alert>
      )}

      {importing && <Alert type="warn">匯入中，請稍候…</Alert>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[
          { type: 'BA', label: 'BA碼派案紀錄', color: C.primary },
          { type: 'non', label: '非輪派單位照會紀錄', color: C.accent },
          { type: 'DA01', label: '交通車派案紀錄', color: C.warning },
        ].map(({ type, label, color }) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: C.bg, borderRadius: 12, border: `1px solid ${C.border}` }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color }}>{label}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>上傳對應分頁的 CSV 檔案</div>
            </div>
            <label style={{ padding: '8px 16px', borderRadius: 8, background: color, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>
              📂 上傳 CSV
              <input type="file" accept=".csv" style={{ display: 'none' }} onChange={e => handleImport(e, type)} disabled={importing} />
            </label>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SheetsTab() {
  const { sheetsConfig, saveSheetsConfig, syncToSheets } = useApp();
  const [url, setUrl] = useState(sheetsConfig.scriptUrl || '');
  const [msg, setMsg] = useState(null);

  async function save() {
    await saveSheetsConfig({ scriptUrl: url });
    setMsg({ type: 'success', text: '✓ 設定已儲存' });
  }
  async function test() {
    if (!url) { setMsg({ type: 'error', text: '請先填寫網址' }); return; }
    setMsg({ type: 'warn', text: '測試中…' });
    syncToSheets({ id: 'test-' + Date.now(), region: '測試區', referralDate: '2026-01-01', managerId: 'u1', clientName: '測試個案', codeType: 'BA', isRotating: true, unit: '測試單位', caseType: '新案', status: '承接', rejectReason: '', referralReason: '', entryDate: '' }, 'add');
    setTimeout(() => setMsg({ type: 'success', text: '✓ 已送出！請到 Google Sheets「BA碼派案紀錄」確認是否出現「測試個案」。' }), 1500);
  }

  const appsScript = `function doGet(e) {
  var p = e.parameter;
  var sheet = SpreadsheetApp.getActiveSpreadsheet();
  var code = p.codeType || '';
  var tabName;
  if(code === 'DA01') tabName = '交通車派案紀錄';
  else if(code === 'BA') tabName = 'BA碼派案紀錄';
  else tabName = '非輪派單位照會紀錄';

  var tab = sheet.getSheetByName(tabName);
  if(!tab) tab = sheet.insertSheet(tabName);

  var headers;
  if(code === 'BA'){
    headers = ['服務區域','派案日期','派案月份','個案姓名','個管人員','服務碼別','派案單位','新舊案','是否為輪派','派案原因','承接狀態','未承接原因','進場日','逾期進場天數','逾期因素','逾期原因','案件ID'];
  } else if(code === 'DA01'){
    headers = ['服務區域','派案日期','派車月份','個案姓名','派車單位','個管人員','是否為輪派','案件ID'];
  } else {
    headers = ['服務區域','派案日期','派案月份','個案姓名','個管人員','派案碼別','派案單位','承接狀態','未承接原因','進場日','逾期進場天數','逾期因素','逾期原因','案件ID'];
  }
  if(tab.getLastRow() === 0) tab.appendRow(headers);

  var idCol = headers.length - 1;

  function buildRow(){
    if(code === 'BA') return [p.region,p.referralDate,p.month,p.clientName,p.manager,p.codeType,p.unit,p.caseType,p.isRotating,p.referralReason,p.status,p.rejectReason,p.entryDate,p.odDays,p.overdueType,p.overdueReason,p.caseId];
    if(code === 'DA01') return [p.region,p.referralDate,p.month,p.clientName,p.unit,p.manager,p.isRotating,p.caseId];
    return [p.region,p.referralDate,p.month,p.clientName,p.manager,p.codeType,p.unit,p.status,p.rejectReason,p.entryDate,p.odDays,p.overdueType,p.overdueReason,p.caseId];
  }

  // 編輯時若碼別被改變，案件可能要移到另一個分頁，先從其他分頁移除舊資料
  if(p.action === 'add' || p.action === 'update'){
    var allTabNames = ['BA碼派案紀錄','交通車派案紀錄','非輪派單位照會紀錄'];
    allTabNames.forEach(function(otherName){
      if(otherName === tabName) return;
      var otherTab = sheet.getSheetByName(otherName);
      if(!otherTab) return;
      var otherRows = otherTab.getDataRange().getValues();
      if(otherRows.length < 2) return;
      var otherIdCol = otherRows[0].length - 1;
      for(var j = otherRows.length - 1; j >= 1; j--){
        if(otherRows[j][otherIdCol] === p.caseId) otherTab.deleteRow(j + 1);
      }
    });
  }

  if(p.action === 'add'){
    tab.appendRow(buildRow());

  } else if(p.action === 'update'){
    var rows = tab.getDataRange().getValues();
    var found = false;
    for(var i = 1; i < rows.length; i++){
      if(rows[i][idCol] === p.caseId){
        tab.getRange(i+1, 1, 1, headers.length).setValues([buildRow()]);
        found = true;
        break;
      }
    }
    if(!found) tab.appendRow(buildRow());

  } else if(p.action === 'delete'){
    // 找到對應列並刪除整列
    var rows = tab.getDataRange().getValues();
    for(var i = rows.length - 1; i >= 1; i--){
      if(rows[i][idCol] === p.caseId){
        tab.deleteRow(i + 1);
        break;
      }
    }
  }

  return ContentService.createTextOutput('OK');
}`;

  return (
    <Card style={{ maxWidth: 620 }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>📊 Google Sheets 即時同步</h3>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>每次新增、編輯或刪除派案紀錄，自動同步寫入 Google Sheets（編輯會整列覆寫，含碼別變更時自動移動分頁）</p>
      <div style={{ background: C.accentL, borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 12, color: C.accent }}>
        <strong>設定步驟：</strong><br />
        1. Google Sheets → 擴充功能 → Apps Script<br />
        2. 貼上下方程式碼 → Deploy → New deployment → Web app<br />
        3. Execute as: Me / Who has access: Anyone → Deploy<br />
        4. 複製網址貼到下方<br />
        <strong>※ 已更新編輯同步邏輯，若先前已部署過，請重新 Deploy 一個新版本（New deployment）才會套用。</strong>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 500 }}>Apps Script 程式碼（點下方全選複製）</label>
        <textarea
          readOnly onClick={e => e.target.select()}
          style={{ width: '100%', height: 200, borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, padding: 12, fontSize: 11, fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }}
          value={appsScript}
        />
      </div>
      <FormField label="Apps Script 網址（部署後取得）">
        <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://script.google.com/macros/s/xxxxx/exec" />
      </FormField>
      {msg && <Alert type={msg.type}>{msg.text}</Alert>}
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <BtnPrimary onClick={save}>儲存設定</BtnPrimary>
        <BtnSecondary onClick={test}>🧪 測試連線</BtnSecondary>
      </div>
    </Card>
  );
}
