import { useApp } from '../AppContext';
import { today, daysBetween, NO_ENTRY_CODES } from '../utils/helpers';
import { Card, PageHeader, BtnSmall, Badge, C } from '../components/UI';

const INNER_UNIT = '齡活股份有限公司附設新北市私立齡活居家長照機構';

export default function Dashboard({ setPage }) {
  const { currentUser, cases } = useApp();
  const t = today();
  const thisMonth = t.slice(0, 7);

  const myCases = currentUser?.role === 'admin' ? cases : cases.filter(c => c.managerId === currentUser?.id);
  const trackable = myCases.filter(c => c.status !== '不承接' && !NO_ENTRY_CODES.includes(c.codeType));
  const withoutEntry = trackable.filter(c => !c.entryDate);
  const overdue = withoutEntry.filter(c => daysBetween(c.referralDate, t) > 5);
  const pending = withoutEntry.filter(c => daysBetween(c.referralDate, t) <= 5);
  const completed = trackable.filter(c => c.entryDate);
  const monthCases = myCases.filter(c => c.referralDate?.startsWith(thisMonth));
  const recent = [...myCases].sort((a, b) => b.referralDate?.localeCompare(a.referralDate)).slice(0, 10);

  // 內外派比：BA碼 + 新案 + 承接 + 本月
  const baNewAccepted = myCases.filter(c =>
    c.codeType === 'BA' && c.caseType === '新案' && c.status === '承接' && c.referralDate?.startsWith(thisMonth)
  );
  const innerCount = baNewAccepted.filter(c => c.unit === INNER_UNIT).length;
  const outerCount = baNewAccepted.filter(c => c.unit !== INNER_UNIT).length;
  const totalBA = innerCount + outerCount;
  const innerRatio = totalBA > 0 ? ((innerCount / totalBA) * 100).toFixed(1) : null;
  const outerRatio = totalBA > 0 ? ((outerCount / totalBA) * 100).toFixed(1) : null;

  const stats = [
    { label: '本月派案', val: monthCases.length, color: C.accent, bg: C.accentL, icon: '📋', link: false },
    { label: '進行中（5天內）', val: pending.length, color: C.warning, bg: C.warningL, icon: '⏳', link: true },
    { label: '逾期未填進場', val: overdue.length, color: C.alert, bg: C.alertL, icon: '⚠️', link: true },
    { label: '已完成進場', val: completed.length, color: C.success, bg: C.successL, icon: '✅', link: false },
  ];

  return (
    <div>
      <PageHeader title="總覽" subtitle={`今日：${t}`} />

      {overdue.length > 0 && (
        <div style={{ background: C.alertL, border: '1px solid #e0a090', borderRadius: 14, padding: '14px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 22 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ color: C.alert, fontWeight: 600, fontSize: 14 }}>有 {overdue.length} 筆案件照會超過5天未填寫進場日期</div>
            <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>請盡快前往「進場時效」頁面處理</div>
          </div>
          <BtnSmall onClick={() => setPage('entry')} style={{ background: C.alert, color: '#fff', border: 'none', whiteSpace: 'nowrap' }}>立即處理</BtnSmall>
        </div>
      )}

      {/* 統計卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
        {stats.map(s => (
          <div
            key={s.label}
            onClick={s.link ? () => setPage('entry') : undefined}
            style={{ background: s.bg, borderRadius: 18, padding: '22px 20px', border: `1px solid ${C.border}`, cursor: s.link ? 'pointer' : 'default', transition: s.link ? 'transform 0.1s' : '' }}
            onMouseEnter={s.link ? e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)'; } : undefined}
            onMouseLeave={s.link ? e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; } : undefined}
          >
            <div style={{ fontSize: 26, marginBottom: 10 }}>{s.icon}</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{s.label}{s.link && <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.6 }}>→</span>}</div>
          </div>
        ))}
      </div>

      {/* 本月 BA 碼內外派比 */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>本月 BA 碼內外派比</h3>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>新案・承接　{thisMonth.replace('-', '年')}月</div>
          </div>
          <div style={{ fontSize: 13, color: C.muted }}>共 {totalBA} 筆</div>
        </div>

        {totalBA === 0 ? (
          <div style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: '16px 0' }}>本月尚無 BA 碼新案承接紀錄</div>
        ) : (
          <>
            {/* 比例長條 */}
            <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', height: 28, marginBottom: 14 }}>
              {innerCount > 0 && (
                <div style={{ width: `${innerRatio}%`, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 600, transition: 'width 0.3s' }}>
                  {innerRatio}%
                </div>
              )}
              {outerCount > 0 && (
                <div style={{ width: `${outerRatio}%`, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 600, transition: 'width 0.3s' }}>
                  {outerRatio}%
                </div>
              )}
            </div>

            {/* 數字明細 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: C.primaryL, borderRadius: 12, padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.primary, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>內派（齡活）</span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: C.primaryH, lineHeight: 1 }}>{innerCount}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>佔 {innerRatio}%</div>
              </div>
              <div style={{ background: C.accentL, borderRadius: 12, padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.accent, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>外派（其他單位）</span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: C.accent, lineHeight: 1 }}>{outerCount}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>佔 {outerRatio}%</div>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* 最近派案紀錄 */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>最近派案紀錄</h3>
          <BtnSmall onClick={() => setPage('cases')}>查看全部</BtnSmall>
        </div>
        {recent.length === 0 ? (
          <div style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: '28px 0' }}>尚無派案紀錄</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>{['照會日', '個案姓名', '碼別', '派案單位', '進場日', '狀態'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 14px', color: C.muted, fontWeight: 500, borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {recent.map(c => {
                  const days = c.entryDate ? daysBetween(c.referralDate, c.entryDate) : daysBetween(c.referralDate, t);
                  const od = !c.entryDate && days > 5 && c.status !== '不承接';
                  return (
                    <tr key={c.id} style={{ borderBottom: `1px solid ${C.border}`, background: od ? `${C.alertL}60` : '' }}>
                      <td style={{ padding: '10px 14px' }}>{c.referralDate}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 500 }}>{c.clientName}</td>
                      <td style={{ padding: '10px 14px' }}><Badge>{c.codeType}</Badge></td>
                      <td style={{ padding: '10px 14px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.unit}</td>
                      <td style={{ padding: '10px 14px' }}>{c.entryDate || <span style={{ color: od ? C.alert : C.warning }}>未填入</span>}</td>
                      <td style={{ padding: '10px 14px' }}>
                        {c.status === '不承接' ? <span style={{ color: C.muted }}>不承接</span>
                          : c.entryDate ? <span style={{ color: C.success }}>✓ 已進場</span>
                          : <span style={{ color: od ? C.alert : C.warning }}>{od ? `⚠️ 逾期 ${days} 天` : `第 ${days} 天`}</span>}
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
