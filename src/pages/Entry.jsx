import { useState } from 'react';
import { useApp } from '../AppContext';
import { today, daysBetween, NO_ENTRY_CODES } from '../utils/helpers';
import { Card, PageHeader, BtnSmall, Badge, Input, Select, Alert, C } from '../components/UI';

export default function Entry() {
  const { currentUser, cases, updateCase } = useApp();
  const [editing, setEditing] = useState(null);
  const [entryDate, setEntryDate] = useState(today());
  const [overdueType, setOverdueType] = useState('案家因素');
  const [overdueReason, setOverdueReason] = useState('');
  const [showDone, setShowDone] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const t = today();

  const myCases = currentUser?.role === 'admin' ? cases : cases.filter(c => c.managerId === currentUser?.id);
  const pending = myCases.filter(c => !c.entryDate && c.status !== '不承接' && !NO_ENTRY_CODES.includes(c.codeType)).sort((a, b) => a.referralDate?.localeCompare(b.referralDate));
  const completed = myCases.filter(c => c.entryDate && c.status !== '不承接' && !NO_ENTRY_CODES.includes(c.codeType)).sort((a, b) => b.entryDate?.localeCompare(a.entryDate));

  function startEdit(c) {
    setEditing(c);
    setEntryDate(today());
    setOverdueType('案家因素');
    setOverdueReason('');
    setSaveMsg(null);
  }

  async function handleSave() {
    if (!entryDate) { setSaveMsg({ type: 'error', text: '請選擇進場日期' }); return; }
    const days = daysBetween(editing.referralDate, entryDate);
    const updates = { entryDate };
    if (days > 5) { updates.overdueType = overdueType; updates.overdueReason = overdueReason; }
    await updateCase(editing.id, updates);
    setEditing(null);
    setSaveMsg(null);
  }

  const editDays = editing && entryDate ? daysBetween(editing.referralDate, entryDate) : 0;

  return (
    <div>
      <PageHeader title="進場時效管理" subtitle={`待填進場：${pending.length} 筆`} />

      {pending.length === 0 && (
        <div style={{ background: C.successL, borderRadius: 16, padding: 32, textAlign: 'center', marginBottom: 24, border: '1px solid #b3d4b7' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
          <div style={{ color: C.success, fontWeight: 600, fontSize: 15 }}>所有案件均已填寫進場日期！</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
        {pending.map(c => {
          const days = daysBetween(c.referralDate, t);
          const od = days > 5;
          const isEditing = editing?.id === c.id;
          return (
            <div key={c.id} style={{ background: C.card, borderRadius: 16, padding: '16px 22px', border: `1px solid ${od ? '#e0a090' : C.border}`, display: 'flex', alignItems: isEditing ? 'flex-start' : 'center', gap: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: od ? C.alertL : C.warningL, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: od ? C.alert : C.warning, lineHeight: 1 }}>{days}</div>
                <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>天</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{c.clientName}</span>
                  <Badge>{c.codeType}</Badge>
                  {od && <span style={{ background: C.alertL, color: C.alert, padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>⚠️ 逾期</span>}
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                  照會日：{c.referralDate}　｜　{c.region}　｜　{c.unit || '—'}
                </div>
                {isEditing && (
                  <div style={{ marginTop: 14, padding: 16, background: C.bg, borderRadius: 12 }}>
                    {saveMsg && <Alert type={saveMsg.type}>{saveMsg.text}</Alert>}
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
                      <label style={{ fontSize: 12, color: C.muted, whiteSpace: 'nowrap' }}>進場日期：</label>
                      <Input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} style={{ width: 160 }} />
                      {editDays > 0 && <span style={{ fontSize: 12, color: editDays > 5 ? C.alert : C.success }}>共 {editDays} 天</span>}
                    </div>
                    {editDays > 5 && (
                      <>
                        <div style={{ background: C.alertL, borderRadius: 8, padding: '8px 12px', fontSize: 12, color: C.alert, marginBottom: 10 }}>⚠️ 進場超過5天，請填寫逾期原因</div>
                        <Select value={overdueType} onChange={e => setOverdueType(e.target.value)} style={{ marginBottom: 8, fontSize: 12 }}>
                          <option>案家因素</option><option>單位因素</option>
                        </Select>
                        <Input value={overdueReason} onChange={e => setOverdueReason(e.target.value)} placeholder="請輸入逾期原因說明" style={{ marginBottom: 10, fontSize: 12 }} />
                      </>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <BtnSmall onClick={handleSave} style={{ background: C.success, color: '#fff', border: 'none' }}>確認儲存</BtnSmall>
                      <BtnSmall onClick={() => setEditing(null)}>取消</BtnSmall>
                    </div>
                  </div>
                )}
              </div>
              {!isEditing && (
                <BtnSmall onClick={() => startEdit(c)} style={{ background: C.accent, color: '#fff', border: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>填寫進場日</BtnSmall>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={() => setShowDone(v => !v)} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 16px', cursor: 'pointer', fontSize: 13, marginBottom: 12, fontFamily: 'inherit' }}>
        {showDone ? '▲' : '▼'} 已完成進場紀錄（{completed.length} 筆）
      </button>

      {showDone && completed.length > 0 && (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ background: C.bg }}>
                <tr>{['照會日', '個案姓名', '碼別', '派案單位', '進場日', '天數', '逾期原因'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: C.muted, fontWeight: 500, fontSize: 12, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {completed.map((c, i) => {
                  const days = daysBetween(c.referralDate, c.entryDate);
                  return (
                    <tr key={c.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 1 ? `${C.bg}50` : '' }}>
                      <td style={{ padding: '10px 14px' }}>{c.referralDate}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 500 }}>{c.clientName}</td>
                      <td style={{ padding: '10px 14px' }}><Badge>{c.codeType}</Badge></td>
                      <td style={{ padding: '10px 14px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.unit}</td>
                      <td style={{ padding: '10px 14px' }}>{c.entryDate}</td>
                      <td style={{ padding: '10px 14px' }}><span style={{ color: days > 5 ? C.alert : C.success, fontWeight: 500 }}>{days} 天</span></td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: C.muted }}>{c.overdueType ? `${c.overdueType}：${c.overdueReason}` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
