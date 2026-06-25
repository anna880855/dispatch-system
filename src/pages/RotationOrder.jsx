import { useState } from 'react';
import { useApp } from '../AppContext';
import { REGIONS, ROTATING_CODES } from '../utils/helpers';
import { Card, PageHeader, Tab, Badge, C } from '../components/UI';

export default function RotationOrder() {
  const { currentUser, units, rotationIndex } = useApp();
  const isAdmin = currentUser?.role === 'admin';
  const lockedRegion = !isAdmin && currentUser?.region ? currentUser.region : null;
  const [region, setRegion] = useState(lockedRegion || '三重');
  const [code, setCode] = useState('BA');

  const list = units.rotating?.[region]?.[code] || [];
  const key = `${region}_${code}`;
  const idx = list.length ? (rotationIndex[key] || 0) % list.length : 0;

  return (
    <div>
      <PageHeader title="輪派順序" subtitle="查看各區輪派單位的順序與目前進度（僅管理員可調整順序及新增刪除）" />

      <Card>
        {lockedRegion ? (
          <div style={{ marginBottom: 12, fontSize: 13, color: C.muted }}>
            服務區域：<strong style={{ color: C.text }}>{lockedRegion}區</strong>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {REGIONS.map(r => <Tab key={r} id={r} label={`${r}區`} active={region === r} onClick={setRegion} />)}
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {ROTATING_CODES.map(c => <Tab key={c} id={c} label={`${c}碼`} active={code === c} onClick={setCode} />)}
        </div>

        {list.length === 0 ? (
          <div style={{ color: C.muted, fontSize: 13, padding: '10px 0' }}>尚未設定輪派單位</div>
        ) : (
          <div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
              目前共 {list.length} 間，進度 {idx + 1} / {list.length}
            </div>
            {list.map((u, i) => {
              const isCurrent = i === idx;
              const isNext = i === (idx + 1) % list.length;
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px',
                  background: isCurrent ? C.warningL : C.bg, borderRadius: 10, marginBottom: 6,
                  border: `1px solid ${isCurrent ? '#e8d5a0' : C.border}`,
                }}>
                  <span style={{ color: C.muted, fontSize: 12, width: 28, textAlign: 'center', fontWeight: isCurrent ? 700 : 400 }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: 13 }}>{u}</span>
                  {isCurrent && <Badge color="warning">🔄 現在輪到</Badge>}
                  {isNext && !isCurrent && <Badge>下一位</Badge>}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
