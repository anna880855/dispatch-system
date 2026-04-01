import { useState } from 'react';
import { useApp } from '../AppContext';
import { today, REGIONS, CODE_TYPES, ROTATING_CODES, REJECT_REASONS, REFERRAL_REASONS, genId } from '../utils/helpers';
import { Card, PageHeader, FormField, Input, Select, BtnPrimary, BtnSecondary, BtnSmall, Alert, C, MultiSelect } from '../components/UI';

function initCodeRow() {
  return {
    id: genId(),
    codeType: '', isRotating: false, unit: '', units: [],
    da01Count: 1, status: '承接',
    rejectReason: '', rejectReasonOther: '',
    referralReason: '', referralReasonOther: '',
  };
}

function getRotUnits(units, region, code, startIdx, count) {
  const list = units.rotating?.[region]?.[code] || [];
  if (!list.length) return [];
  return Array.from({ length: count }, (_, i) => list[(startIdx + i) % list.length]);
}

function CodeRow({ row, index, total, region, units, getCurrentRotUnit, onChange, onRemove }) {
  const isRotatingCode = ROTATING_CODES.includes(row.codeType);
  const isDA01 = row.codeType === 'DA01';
  const rotInfo = row.isRotating && region && row.codeType ? getCurrentRotUnit(region, row.codeType) : null;
  const da01Units = row.isRotating && isDA01 && rotInfo
    ? getRotUnits(units, region, row.codeType, rotInfo.index, row.da01Count)
    : [];

  function getUnitList() {
    if (!row.codeType) return [];
    if (row.isRotating && ROTATING_CODES.includes(row.codeType))
      return units.rotating?.[region]?.[row.codeType] || [];
    return units.nonRotating?.[row.codeType] || [];
  }
  const unitList = getUnitList();
  function set(k, v) { onChange({ ...row, [k]: v }); }
  function setCode(v) { onChange({ ...row, codeType: v, isRotating: false, unit: '', units: [], da01Count: 1, referralReason: '', rejectReason: '' }); }
  function setRotating(v) {
    const rot = v && region && row.codeType ? getCurrentRotUnit(region, row.codeType) : null;
    onChange({ ...row, isRotating: v, unit: rot ? rot.unit : '', units: [], da01Count: 1 });
  }

  return (
    <div style={{ background: C.bg, borderRadius: 14, padding: '16px 20px', border: `1px solid ${C.border}`, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ background: C.primary, color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>
            碼別 {index + 1}
          </span>
          {row.codeType && <span style={{ fontSize: 13, color: C.muted }}>{row.codeType}{row.isRotating ? '・輪派' : ''}</span>}
        </div>
        {total > 1 && (
          <button onClick={onRemove} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 16, padding: 4 }}>✕</button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
        <FormField label="服務碼別" required>
          <Select value={row.codeType} onChange={e => setCode(e.target.value)}>
            <option value="">請選擇</option>
            {CODE_TYPES.map(c => <option key={c} value={c}>{c}{ROTATING_CODES.includes(c) ? '（可輪派）' : ''}</option>)}
          </Select>
        </FormField>

        <FormField label="承接狀態">
          <Select value={row.status} onChange={e => set('status', e.target.value)}>
            <option>承接</option><option>不承接</option>
          </Select>
        </FormField>

        {isRotatingCode && (
          <FormField label="是否為輪派">
            <div style={{ display: 'flex', gap: 16, paddingTop: 8 }}>
              {[{ v: false, l: '非輪派' }, { v: true, l: '輪派' }].map(opt => (
                <label key={opt.l} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                  <input type="radio" checked={row.isRotating === opt.v} onChange={() => setRotating(opt.v)} />
                  {opt.l}
                </label>
              ))}
            </div>
          </FormField>
        )}

        {row.isRotating && isDA01 && (
          <FormField label="本次派出幾間">
            <div style={{ display: 'flex', gap: 8 }}>
              {[1, 2, 3].map(n => (
                <button key={n} onClick={() => set('da01Count', n)}
                  style={{ flex: 1, padding: '7px', borderRadius: 8, border: `2px solid ${row.da01Count === n ? C.primary : C.border}`, background: row.da01Count === n ? C.primaryL : C.card, color: row.da01Count === n ? C.primaryH : C.text, fontWeight: row.da01Count === n ? 600 : 400, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
                  {n} 間
                </button>
              ))}
            </div>
          </FormField>
        )}

        {row.status === '不承接' && (
          <FormField label="不承接原因">
            <Select value={row.rejectReason} onChange={e => onChange({ ...row, rejectReason: e.target.value, rejectReasonOther: '' })}>
              <option value="">請選擇</option>
              {(REJECT_REASONS[row.codeType] || REJECT_REASONS.BA).map(o => <option key={o}>{o}</option>)}
            </Select>
            {row.rejectReason === '其他' && (
              <Input style={{ marginTop: 6 }} value={row.rejectReasonOther} onChange={e => set('rejectReasonOther', e.target.value)} placeholder="請說明原因" />
            )}
          </FormField>
        )}

        <FormField label={row.isRotating ? '派案單位（輪派）' : unitList.length > 0 ? '派案單位（可多選）' : '派案單位'} fullWidth>
          {row.isRotating ? (
            rotInfo ? (
              <div style={{ background: C.warningL, borderRadius: 10, padding: '12px 16px', border: '1px solid #e8d5a0' }}>
                <div style={{ fontWeight: 600, color: C.warning, fontSize: 12, marginBottom: 8 }}>
                  🔄 第 {rotInfo.index + 1} 號起，共派 {isDA01 ? row.da01Count : 1} 間
                </div>
                {(isDA01 ? da01Units : [rotInfo.unit]).map((u, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ background: C.warning, color: '#fff', borderRadius: 5, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>
                      {rotInfo.index + i + 1}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{u}</span>
                  </div>
                ))}
                <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
                  儲存後自動推進 {isDA01 ? row.da01Count : 1} 個順位
                </div>
              </div>
            ) : <div style={{ color: C.muted, fontSize: 13 }}>⚠️ 尚未設定輪派清單</div>
          ) : unitList.length > 0 ? (
            <MultiSelect options={unitList} selected={row.units} onChange={v => set('units', v)} placeholder="輸入關鍵字篩選單位" />
          ) : (
            <Input value={row.unit} onChange={e => set('unit', e.target.value)} placeholder={row.codeType ? '直接輸入單位名稱' : '請先選擇碼別'} />
          )}
        </FormField>

                {!row.isRotating && row.codeType && ROTATING_CODES.includes(row.codeType) && (
          <FormField label="派案原因" required fullWidth>
            <Select value={row.referralReason} onChange={e => onChange({ ...row, referralReason: e.target.value, referralReasonOther: '' })}>
              <option value="">請選擇</option>
              {REFERRAL_REASONS.map(o => <option key={o} value={o}>{o}</option>)}
            </Select>
            {row.referralReason === '其他' && (
              <Input style={{ marginTop: 8 }} value={row.referralReasonOther}
                onChange={e => set('referralReasonOther', e.target.value)}
                placeholder="請說明其他原因" />
            )}
          </FormField>
        )}
      </div>
    </div>
  );
}

export default function NewCase({ setPage }) {
  const { currentUser, users, units, addCase, advanceRotation, getCurrentRotUnit } = useApp();
  const isManager = currentUser?.role === 'manager';
  const managers = users.filter(u => u.role === 'manager');

  const [base, setBase] = useState({
    referralDate: today(), clientName: '',
    managerId: isManager ? currentUser.id : '',
    region: isManager ? currentUser.region : '',
    caseType: '新案',
  });
  const [rows, setRows] = useState([initCodeRow()]);
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  function setBase_(k, v) { setBase(f => ({ ...f, [k]: v })); }
  function updateRow(idx, newRow) { setRows(rs => rs.map((r, i) => i === idx ? newRow : r)); }
  function addRow() { setRows(rs => [...rs, initCodeRow()]); }
  function removeRow(idx) { setRows(rs => rs.filter((_, i) => i !== idx)); }

  async function handleSubmit() {
    if (!base.clientName.trim() || !base.managerId || !base.region) {
      setMsg({ type: 'error', text: '請填寫個案姓名、個管人員、服務區域' }); return;
    }
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.codeType) { setMsg({ type: 'error', text: `碼別 ${i + 1}：請選擇服務碼別` }); return; }
      if (!r.isRotating && ROTATING_CODES.includes(r.codeType) && !r.referralReason) {
        setMsg({ type: 'error', text: `碼別 ${i + 1}：請選擇派案原因` }); return;
      }
    }

    setSaving(true);
    try {
      let totalCount = 0;
      for (const row of rows) {
        const isDA01 = row.codeType === 'DA01';
        const rotInfo = row.isRotating && base.region && row.codeType ? getCurrentRotUnit(base.region, row.codeType) : null;
        let unitsList = [];
        if (row.isRotating) {
          unitsList = isDA01
            ? getRotUnits(units, base.region, row.codeType, rotInfo?.index || 0, row.da01Count)
            : rotInfo ? [rotInfo.unit] : [];
        } else {
          unitsList = row.units.length > 0 ? row.units : row.unit ? [row.unit] : [''];
        }
        const finalReferral = row.referralReason === '其他' && row.referralReasonOther ? `其他：${row.referralReasonOther}` : row.referralReason;
        const finalReject = row.rejectReason === '其他' && row.rejectReasonOther ? `其他：${row.rejectReasonOther}` : row.rejectReason;
        for (const u of unitsList) {
          await addCase({ ...base, codeType: row.codeType, isRotating: row.isRotating, unit: u, status: row.status, referralReason: finalReferral, rejectReason: finalReject });
          totalCount++;
        }
        if (row.isRotating && ROTATING_CODES.includes(row.codeType)) {
          const times = isDA01 ? row.da01Count : 1;
          for (let i = 0; i < times; i++) await advanceRotation(base.region, row.codeType);
        }
      }
      setMsg({ type: 'success', text: `✓ 已成功建立 ${totalCount} 筆派案紀錄！` });
      setBase({ referralDate: today(), clientName: '', managerId: isManager ? currentUser.id : '', region: isManager ? currentUser.region : '', caseType: '新案' });
      setRows([initCodeRow()]);
    } catch (e) {
      setMsg({ type: 'error', text: `儲存失敗：${e.message}` });
    }
    setSaving(false);
  }

  return (
    <div style={{ paddingBottom: 100 }}>
      <PageHeader title="新增派案" subtitle="填一次個案資料，可新增多個碼別一次儲存" />

      {/* 個案基本資料 */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: C.text, marginBottom: 16 }}>📋 個案基本資料</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px' }}>
          <FormField label="照會日（派案日）" required>
            <Input type="date" value={base.referralDate} onChange={e => setBase_('referralDate', e.target.value)} />
          </FormField>
          <FormField label="個案姓名" required>
            <Input value={base.clientName} onChange={e => setBase_('clientName', e.target.value)} placeholder="請輸入個案姓名" />
          </FormField>
          <FormField label="個管人員" required>
            {isManager ? (
              <div style={{ padding: '9px 12px', background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>👤</span><span style={{ fontWeight: 500 }}>{currentUser.name}</span>
                <span style={{ color: C.muted, fontSize: 11 }}>（已自動帶入）</span>
              </div>
            ) : (
              <Select value={base.managerId} onChange={e => setBase_('managerId', e.target.value)}>
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
              <Select value={base.region} onChange={e => setBase_('region', e.target.value)}>
                <option value="">請選擇</option>
                {REGIONS.map(r => <option key={r}>{r}</option>)}
              </Select>
            )}
          </FormField>
          <FormField label="新舊案">
            <Select value={base.caseType} onChange={e => setBase_('caseType', e.target.value)}>
              <option>新案</option><option>舊案</option>
            </Select>
          </FormField>
        </div>
      </Card>

      {/* 碼別列 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: C.text }}>
          📌 服務碼別
          <span style={{ color: C.muted, fontWeight: 400, fontSize: 12, marginLeft: 8 }}>共 {rows.length} 個</span>
        </div>
        <BtnSmall onClick={addRow} style={{ background: C.primary, color: '#fff', border: 'none' }}>
          ＋ 新增碼別
        </BtnSmall>
      </div>

      {rows.map((row, idx) => (
        <CodeRow
          key={row.id} row={row} index={idx} total={rows.length}
          region={base.region} units={units}
          getCurrentRotUnit={getCurrentRotUnit}
          onChange={newRow => updateRow(idx, newRow)}
          onRemove={() => removeRow(idx)}
        />
      ))}

      {msg && <Alert type={msg.type}>{msg.text}</Alert>}

      <div style={{ display: 'flex', gap: 12, marginTop: 16, position: 'sticky', bottom: 0, background: 'rgba(240,235,228,0.95)', padding: '16px 0', backdropFilter: 'blur(4px)', zIndex: 10 }}>
        <BtnPrimary style={{ flex: 1 }} onClick={handleSubmit} disabled={saving}>
          {saving ? '儲存中…' : rows.length > 1 ? `儲存全部派案（${rows.length} 個碼別）` : '儲存派案'}
        </BtnPrimary>
        <BtnSecondary onClick={() => setPage('cases')}>查看紀錄</BtnSecondary>
      </div>
    </div>
  );
}
