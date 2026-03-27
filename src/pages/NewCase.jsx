import { useState } from 'react';
import { useApp } from '../AppContext';
import { today, REGIONS, CODE_TYPES, ROTATING_CODES, REJECT_REASONS, REFERRAL_REASONS, genId } from '../utils/helpers';
import { Card, PageHeader, FormField, Input, Select, BtnPrimary, BtnSecondary, Alert, C, SearchableSelect, MultiSelect } from '../components/UI';

function initForm(user) {
  return {
    referralDate: today(), clientName: '',
    managerId: user?.role === 'manager' ? user.id : '',
    region: user?.role === 'manager' ? user.region : '',
    codeType: '', isRotating: false, unit: '', units: [],
    caseType: '新案', status: '承接', rejectReason: '', rejectReasonOther: '',
    referralReason: '', referralReasonOther: '',
  };
}

export default function NewCase({ setPage }) {
  const { currentUser, users, units, addCase, advanceRotation, getCurrentRotUnit } = useApp();
  const [form, setForm] = useState(() => initForm(currentUser));
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  const isManager = currentUser?.role === 'manager';
  const managers = users.filter(u => u.role === 'manager');
  const isRotating = ROTATING_CODES.includes(form.codeType);

  function getUnitList() {
    if (!form.codeType) return [];
    if (form.isRotating && ROTATING_CODES.includes(form.codeType)) {
      return units.rotating?.[form.region]?.[form.codeType] || [];
    }
    return units.nonRotating?.[form.codeType] || [];
  }

  const unitList = getUnitList();
  const rotInfo = form.isRotating && form.region && form.codeType ? getCurrentRotUnit(form.region, form.codeType) : null;

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function setCode(v) { setForm(f => ({ ...f, codeType: v, isRotating: false, unit: '', units: [], referralReason: '', rejectReason: '' })); }
  function setRegion(v) { setForm(f => ({ ...f, region: v, unit: '', units: [] })); }
  function setRotating(v) {
    const rot = v && form.region && form.codeType ? getCurrentRotUnit(form.region, form.codeType) : null;
    setForm(f => ({ ...f, isRotating: v, unit: rot ? rot.unit : '', units: [] }));
  }

  async function handleSubmit() {
    if (!form.clientName.trim() || !form.codeType || !form.managerId || !form.region) {
      setMsg({ type: 'error', text: '請填寫所有必填欄位（個案姓名、碼別、個管人員、區域）' }); return;
    }
    if (!form.isRotating && ROTATING_CODES.includes(form.codeType) && !form.referralReason) {
      setMsg({ type: 'error', text: '請選擇派案原因' }); return;
    }
    const unitsList = form.isRotating ? [form.unit].filter(Boolean) : (form.units.length > 0 ? form.units : form.unit ? [form.unit] : []);
    if (unitList.length > 0 && unitsList.length === 0) {
      setMsg({ type: 'error', text: '請選擇派案單位' }); return;
    }

    setSaving(true);
    try {
      let finalReferral = form.referralReason;
      if (finalReferral === '其他' && form.referralReasonOther) finalReferral = `其他：${form.referralReasonOther}`;
      let finalReject = form.rejectReason;
      if (finalReject === '其他' && form.rejectReasonOther) finalReject = `其他：${form.rejectReasonOther}`;

      for (const u of unitsList) {
        await addCase({ ...form, unit: u, units: undefined, referralReason: finalReferral, rejectReason: finalReject });
      }
      if (form.isRotating && ROTATING_CODES.includes(form.codeType)) {
        await advanceRotation(form.region, form.codeType);
      }
      setMsg({ type: 'success', text: unitsList.length > 1 ? `✓ 已成功建立 ${unitsList.length} 筆派案紀錄！` : '✓ 派案已成功記錄！' });
      setForm(initForm(currentUser));
    } catch (e) {
      setMsg({ type: 'error', text: `儲存失敗：${e.message}` });
    }
    setSaving(false);
  }

  return (
    <div>
      <PageHeader title="新增派案" subtitle="照會日即為派案當日" />
      <Card style={{ maxWidth: 720 }}>
        {msg && <Alert type={msg.type}>{msg.text}</Alert>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 24px' }}>
          <FormField label="照會日（派案日）" required>
            <Input type="date" value={form.referralDate} onChange={e => set('referralDate', e.target.value)} />
          </FormField>

          <FormField label="個案姓名" required>
            <Input value={form.clientName} onChange={e => set('clientName', e.target.value)} placeholder="請輸入個案姓名" />
          </FormField>

          <FormField label="個管人員" required>
            {isManager ? (
              <div style={{ padding: '9px 12px', background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>👤</span><span style={{ fontWeight: 500 }}>{currentUser.name}</span>
                <span style={{ color: C.muted, fontSize: 11 }}>（已自動帶入）</span>
              </div>
            ) : (
              <Select value={form.managerId} onChange={e => set('managerId', e.target.value)}>
                <option value="">請選擇</option>
                {managers.map(u => <option key={u.id} value={u.id}>{u.name}（{u.region || '—'}區）</option>)}
              </Select>
            )}
          </FormField>

          <FormField label="服務區域" required>
            {isManager ? (
              <div style={{ padding: '9px 12px', background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📍</span><span style={{ fontWeight: 500 }}>{currentUser.region}區</span>
                <span style={{ color: C.muted, fontSize: 11 }}>（已自動帶入）</span>
              </div>
            ) : (
              <Select value={form.region} onChange={e => setRegion(e.target.value)}>
                <option value="">請選擇</option>
                {REGIONS.map(r => <option key={r}>{r}</option>)}
              </Select>
            )}
          </FormField>

          <FormField label="服務碼別" required>
            <Select value={form.codeType} onChange={e => setCode(e.target.value)}>
              <option value="">請選擇</option>
              {CODE_TYPES.map(c => <option key={c} value={c}>{c}{ROTATING_CODES.includes(c) ? '（可輪派）' : ''}</option>)}
            </Select>
          </FormField>

          {isRotating && (
            <FormField label="是否為輪派">
              <div style={{ display: 'flex', gap: 20, paddingTop: 10 }}>
                {[{ v: false, l: '非輪派（特約單位）' }, { v: true, l: '輪派' }].map(opt => (
                  <label key={opt.l} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                    <input type="radio" checked={form.isRotating === opt.v} onChange={() => setRotating(opt.v)} />
                    {opt.l}
                  </label>
                ))}
              </div>
            </FormField>
          )}

          <FormField label={form.isRotating ? '派案單位' : unitList.length > 0 ? '派案單位（可多選）' : '派案單位'} fullWidth={!isRotating}>
            {form.isRotating ? (
              rotInfo ? (
                <div style={{ background: C.warningL, borderRadius: 12, padding: '14px 18px', border: '1px solid #e8d5a0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 18 }}>🔄</span>
                    <span style={{ fontWeight: 600, color: C.warning, fontSize: 13 }}>輪派順序 第 {rotInfo.index + 1} / {rotInfo.total} 號</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>{rotInfo.unit}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>儲存後（不論承接或不承接）自動推進至下一間</div>
                </div>
              ) : <div style={{ color: C.muted, fontSize: 13 }}>⚠️ 尚未設定輪派清單，請至管理後台新增</div>
            ) : unitList.length > 0 ? (
              <MultiSelect options={unitList} selected={form.units} onChange={v => set('units', v)} placeholder="輸入關鍵字篩選單位" />
            ) : (
              <Input value={form.unit} onChange={e => set('unit', e.target.value)} placeholder={form.codeType ? '可至管理後台設定單位，或直接輸入' : '請先選擇碼別'} />
            )}
          </FormField>

          <FormField label="新舊案">
            <Select value={form.caseType} onChange={e => set('caseType', e.target.value)}>
              <option>新案</option><option>舊案</option>
            </Select>
          </FormField>

          <FormField label="承接狀態">
            <Select value={form.status} onChange={e => { set('status', e.target.value); set('rejectReason', ''); }}>
              <option>承接</option><option>不承接</option>
            </Select>
          </FormField>

          {form.status === '不承接' && (
            <FormField label="不承接原因">
              <Select value={form.rejectReason} onChange={e => { set('rejectReason', e.target.value); set('rejectReasonOther', ''); }}>
                <option value="">請選擇</option>
                {(REJECT_REASONS[form.codeType] || REJECT_REASONS.BA).map(o => <option key={o}>{o}</option>)}
              </Select>
              {form.rejectReason === '其他' && (
                <Input style={{ marginTop: 8 }} value={form.rejectReasonOther} onChange={e => set('rejectReasonOther', e.target.value)} placeholder="請說明原因" />
              )}
            </FormField>
          )}

          {!form.isRotating && form.codeType && ROTATING_CODES.includes(form.codeType) && (
            <FormField label="派案原因" required fullWidth>
              <Select value={form.referralReason} onChange={e => { set('referralReason', e.target.value); set('referralReasonOther', ''); }}>
                <option value="">請選擇派案原因</option>
                {REFERRAL_REASONS.map(o => <option key={o}>{o}</option>)}
              </Select>
              {form.referralReason === '其他' && (
                <Input style={{ marginTop: 8 }} value={form.referralReasonOther} onChange={e => set('referralReasonOther', e.target.value)} placeholder="請說明原因" />
              )}
            </FormField>
          )}
        </div>

        <div style={{ marginTop: 28, display: 'flex', gap: 12 }}>
          <BtnPrimary style={{ flex: 1 }} onClick={handleSubmit} disabled={saving}>
            {saving ? '儲存中…' : '儲存派案'}
          </BtnPrimary>
          <BtnSecondary onClick={() => setPage('cases')}>查看紀錄</BtnSecondary>
        </div>
      </Card>
    </div>
  );
}
