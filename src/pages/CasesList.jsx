import { useState } from 'react';
import { useApp } from '../AppContext';
import { today, daysBetween, REGIONS, CODE_TYPES, ROTATING_CODES, REJECT_REASONS, REFERRAL_REASONS } from '../utils/helpers';
import { Card, PageHeader, FormField, Input, Select, BtnSmall, BtnSecondary, Alert, Badge, C } from '../components/UI';

function EditForm({ c, onSave, onCancel }) {
  const [form, setForm] = useState({ ...c });
  const [msg, setMsg] = useState(null);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function save() {
    if (!form.clientName?.trim()) { setMsg({ type: 'error', text: '請填寫個案姓名' }); return; }
    if (!form.referralDate) { setMsg({ type: 'error', text: '請填寫照會日期' }); return; }
    onSave(form);
  }

  const days = form.entryDate ? daysBetween(form.referralDate, form.entryDate) : 0;

  return (
    <tr>
      <td colSpan={11} style={{ padding: 0 }}>
        <div style={{ background: C.primaryL, padding: 18, border: `1px solid ${C.primary}`, borderRadius: 0 }}>
          {msg && <Alert type={msg.type}>{msg.text}</Alert>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
            <FormField label="照會日"><Input type="date" value={form.referralDate || ''} onChange={e => set('referralDate', e.target.value)} /></FormField>
            <FormField label="個案姓名"><Input value={form.clientName || ''} onChange={e => set('clientName', e.target.value)} /></FormField>
            <FormField label="服務區域">
              <Select value={form.region || ''} onChange={e => set('region', e.target.value)}>
                <option value="">請選擇</option>
                {REGIONS.map(r => <option key={r}>{r}</option>)}
              </Select>
            </FormField>
            <FormField label="服務碼別">
              <Select value={form.codeType || ''} onChange={e => set('codeType', e.target.value)}>
                <option value="">請選擇</option>
                {CODE_TYPES.map(c => <option key={c}>{c}</option>)}
              </Select>
            </FormField>
            <FormField label="派案單位"><Input value={form.unit || ''} onChange={e => set('unit', e.target.value)} /></FormField>
            <FormField label="新舊案">
              <Select value={form.caseType || ''} onChange={e => set('caseType', e.target.value)}>
                <option>新案</option><option>舊案</option>
              </Select>
            </FormField>
            <FormField label="是否為輪派">
              <Select value={form.isRotating ? '是' : '否'} onChange={e => set('isRotating', e.target.value === '是')}>
                <option value="否">否</option><option value="是">是</option>
              </Select>
            </FormField>
            <FormField label="承接狀態">
              <Select value={form.status || ''} onChange={e => set('status', e.target.value)}>
                <option>承接</option><option>不承接</option>
              </Select>
            </FormField>
            {!form.isRotating && ROTATING_CODES.includes(form.codeType) && (
              <FormField label="派案原因">
                <Select value={form.referralReason || ''} onChange={e => set('referralReason', e.target.value)}>
                  <option value="">請選擇</option>
                  {REFERRAL_REASONS.map(o => <option key={o}>{o}</option>)}
                </Select>
              </FormField>
            )}
            {form.status === '不承接' && (
              <FormField label="不承接原因">
                <Select value={form.rejectReason || ''} onChange={e => set('rejectReason', e.target.value)}>
                  <option value="">請選擇</option>
                  {(REJECT_REASONS[form.codeType] || REJECT_REASONS.BA).map(o => <option key={o}>{o}</option>)}
                </Select>
              </FormField>
            )}
            <FormField label="進場日"><Input type="date" value={form.entryDate || ''} onChange={e => set('entryDate', e.target.value)} /></FormField>
            {days > 5 && (
              <>
                <FormField label="逾期因素">
                  <Select value={form.overdueType || ''} onChange={e => set('overdueType', e.target.value)}>
                    <option value="">請選擇</option>
                    <option>案家因素</option><option>單位因素</option>
                  </Select>
                </FormField>
                <FormField label="逾期原因"><Input value={form.overdueReason || ''} onChange={e => set('overdueReason', e.target.value)} /></FormField>
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <BtnSmall onClick={save} style={{ background: C.success, color: '#fff', border: 'none' }}>儲存變更</BtnSmall>
            <BtnSmall onClick={onCancel}>取消</BtnSmall>
          </div>
        </div>
      </td>
    </tr>
  );
}

export default function CasesList() {
  const { currentUser, cases, updateCase, deleteCase } = useApp();
  const [filter, setFilter] = useState({ region: '', codeType: '', month: '', search: '' });
  const [editingId, setEditingId] = useState(null);
  const t = today();

  const myCases = currentUser?.role === 'admin' ? cases : cases.filter(c => c.managerId === currentUser?.id);
  const filtered = myCases.filter(c => {
    if (filter.region && c.region !== filter.region) return false;
    if (filter.codeType && c.codeType !== filter.codeType) return false;
    if (filter.month && !c.referralDate?.startsWith(filter.month)) return false;
    if (filter.search && !c.clientName?.includes(filter.search)) return false;
    return true;
  }).sort((a, b) => b.referralDate?.localeCompare(a.referralDate));

  function cf(k, v) { setFilter(f => ({ ...f, [k]: v })); }

  async function handleDelete(id) {
    if (!window.confirm('確定要刪除這筆派案紀錄？此操作無法復原。')) return;
    await deleteCase(id);
  }

  async function handleSave(form) {
    const { id, createdAt, ...updates } = form;
    await updateCase(id, updates);
    setEditingId(null);
  }

  return (
    <div>
      <PageHeader title="派案紀錄" subtitle={`篩選結果：${filtered.length} 筆`} />

      <div style={{ background: C.card, borderRadius: 14, padding: '16px 20px', marginBottom: 16, border: `1px solid ${C.border}`, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <Input value={filter.search} onChange={e => cf('search', e.target.value)} placeholder="🔍 搜尋個案姓名" style={{ width: 160 }} />
        <Select value={filter.region} onChange={e => cf('region', e.target.value)} style={{ width: 110 }}>
          <option value="">全部區域</option>
          {REGIONS.map(r => <option key={r}>{r}</option>)}
        </Select>
        <Select value={filter.codeType} onChange={e => cf('codeType', e.target.value)} style={{ width: 110 }}>
          <option value="">全部碼別</option>
          {CODE_TYPES.map(c => <option key={c}>{c}</option>)}
        </Select>
        <Input type="month" value={filter.month} onChange={e => cf('month', e.target.value)} style={{ width: 145 }} />
        <BtnSecondary onClick={() => setFilter({ region: '', codeType: '', month: '', search: '' })}>清除</BtnSecondary>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: C.muted, fontSize: 13 }}>無符合條件的派案紀錄</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.bg }}>
                  {['照會日', '個案姓名', '區域', '碼別', '輪派', '派案單位', '新舊案', '承接', '進場日', '天數', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: C.muted, fontWeight: 500, fontSize: 12, borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => {
                  const days = c.entryDate ? daysBetween(c.referralDate, c.entryDate) : daysBetween(c.referralDate, t);
                  const od = !c.entryDate && days > 5 && c.status !== '不承接';
                  if (editingId === c.id) {
                    return <EditForm key={c.id} c={c} onSave={handleSave} onCancel={() => setEditingId(null)} />;
                  }
                  return (
                    <tr key={c.id} style={{ borderBottom: `1px solid ${C.border}`, background: od ? `${C.alertL}60` : i % 2 === 1 ? `${C.bg}50` : '' }}>
                      <td style={{ padding: '10px 14px' }}>{c.referralDate}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 500 }}>{c.clientName}</td>
                      <td style={{ padding: '10px 14px' }}>{c.region}</td>
                      <td style={{ padding: '10px 14px' }}><Badge>{c.codeType}</Badge></td>
                      <td style={{ padding: '10px 14px' }}>{c.isRotating ? <span style={{ color: C.accent, fontSize: 11 }}>● 輪</span> : <span style={{ color: C.muted, fontSize: 11 }}>非</span>}</td>
                      <td style={{ padding: '10px 14px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.unit}>{c.unit}</td>
                      <td style={{ padding: '10px 14px' }}>{c.caseType}</td>
                      <td style={{ padding: '10px 14px' }}><span style={{ color: c.status === '承接' ? C.success : C.muted }}>{c.status}</span></td>
                      <td style={{ padding: '10px 14px' }}>{c.entryDate || <span style={{ color: od ? C.alert : C.warning }}>未填</span>}</td>
                      <td style={{ padding: '10px 14px' }}><span style={{ color: od ? C.alert : c.entryDate && days > 5 ? C.warning : C.success, fontWeight: 500 }}>{days}天</span></td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <button onClick={() => setEditingId(c.id)} style={{ background: 'none', border: 'none', color: C.accent, cursor: 'pointer', fontSize: 14, padding: 4 }} title="編輯">✏️</button>
                        <button onClick={() => handleDelete(c.id)} style={{ background: 'none', border: 'none', color: C.alert, cursor: 'pointer', fontSize: 14, padding: 4 }} title="刪除">🗑</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
