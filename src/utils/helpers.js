export function today() {
  return new Date().toISOString().slice(0, 10);
}

// 預設放假日（YYYY-MM-DD → 說明），週末另外排除。
// 系統第一次載入時寫入 Firebase「holidays」，之後以管理後台「放假日」維護為準（可加颱風假等例外）。
export const DEFAULT_HOLIDAYS = {
  // 2025
  '2025-01-01':'開國紀念日','2025-01-27':'春節','2025-01-28':'春節','2025-01-29':'春節','2025-01-30':'春節',
  '2025-01-31':'春節','2025-02-28':'和平紀念日','2025-04-03':'兒童節補假','2025-04-04':'兒童節及清明節',
  '2025-05-01':'勞動節','2025-05-30':'端午節補假','2025-05-31':'端午節','2025-09-29':'教師節補假','2025-10-06':'中秋節',
  '2025-10-10':'國慶日','2025-10-24':'光復節補假','2025-12-25':'行憲紀念日',
  // 2026
  '2026-01-01':'開國紀念日','2026-02-16':'春節（除夕）','2026-02-17':'春節','2026-02-18':'春節','2026-02-19':'春節',
  '2026-02-20':'小年夜補假','2026-02-27':'和平紀念日補假','2026-04-03':'兒童節補假',
  '2026-04-06':'清明節補假','2026-05-01':'勞動節','2026-06-19':'端午節','2026-09-25':'中秋節','2026-09-28':'教師節',
  '2026-10-09':'國慶日補假','2026-10-10':'國慶日','2026-10-26':'光復節補假','2026-12-25':'行憲紀念日',
  // 2027（僅列平日放假日）
  '2027-01-01':'開國紀念日','2027-02-04':'春節（小年夜）','2027-02-05':'春節（除夕）','2027-02-08':'春節','2027-02-09':'春節補假',
  '2027-02-10':'春節補假','2027-03-01':'和平紀念日補假','2027-04-05':'清明節','2027-04-06':'兒童節補假','2027-04-30':'勞動節補假',
  '2027-06-09':'端午節','2027-09-15':'中秋節','2027-09-28':'教師節','2027-10-11':'國慶日補假','2027-10-25':'光復節',
  '2027-12-24':'行憲紀念日補假','2027-12-31':'開國紀念日補假',
};

let TW_HOLIDAYS = new Set(Object.keys(DEFAULT_HOLIDAYS));

// 由 AppContext 載入 Firebase 的放假日後呼叫
export function setHolidayDates(dates) {
  TW_HOLIDAYS = new Set(dates);
}

function toLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isHoliday(date) {
  const dow = date.getDay();
  if (dow === 0 || dow === 6) return true;
  return TW_HOLIDAYS.has(toLocalDateStr(date));
}

// Count working days from d1 to d2 (inclusive), excluding weekends and holidays.
// 照會日當天算第一天（若照會日本身為假日則不計入）。
export function daysBetween(d1, d2) {
  const a = new Date(d1); a.setHours(0, 0, 0, 0);
  const b = new Date(d2); b.setHours(0, 0, 0, 0);
  if (b < a) return 0;
  let count = 0;
  const cur = new Date(a);
  while (cur <= b) {
    if (!isHoliday(cur)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function getMonth(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, '0')}月`;
}

export function getManagerName(users, managerId) {
  const u = users.find(x => x.id === managerId);
  return u ? u.name : managerId || '';
}

export const REGIONS = ['三重', '中和', '新莊', '板橋'];
export const CODE_TYPES = ['BA', 'BB', 'BC', 'CA', 'CB', 'CC', 'CD', 'DA01', 'BA09', 'GA', 'SC'];
export const ROTATING_CODES = ['BA', 'DA01'];
export const NO_ENTRY_CODES = ['DA01', 'BA09', 'GA', 'SC'];

export const REJECT_REASONS = {
  BA: ['服務量能已滿', '未及時回應', '違規暫停派案', '其他'],
  BB: ['服務量能已滿', '未及時回應', '違規暫停派案', '其他'],
  BC: ['服務量能已滿', '未及時回應', '違規暫停派案', '其他'],
  CA: ['服務量能已滿', '專業不符', '其他'],
  CB: ['服務量能已滿', '專業不符', '其他'],
  CC: ['服務量能已滿', '專業不符', '其他'],
  CD: ['服務量能已滿', '專業不符', '其他'],
  DA01: ['量能不足', '逾期未回應', '其他'],
  GA: ['服務量能已滿', '專業不符', '其他'],
  BA09: ['服務量能已滿', '專業不符', '其他'],
  SC: ['服務量能已滿', '專業不符', '其他'],
};

export const REFERRAL_REASONS = ['案家指定', '二輪輪派', '急件處理', '合作單位優先', '加分輪序增加', '復評重新派案', '其他'];

export const UNABLE_ENTRY_REASONS = ['個案死亡', '個案住院', '案家反悔更改服務'];

// 案件所屬年度：依照會日的年份
export function getCaseYear(c) {
  return (c?.referralDate || today()).slice(0, 4);
}

// 舊版只有單一 scriptUrl，對應 2026 年（含）以前的 Google Sheet
const LEGACY_LAST_YEAR = '2026';

// 取得某年度對應的 Apps Script 網址；未設定回傳空字串
export function getSheetUrl(cfg, year) {
  const url = cfg?.urls?.[year];
  if (url) return url;
  if (cfg?.scriptUrl && year <= LEGACY_LAST_YEAR) return cfg.scriptUrl;
  return '';
}

// 已結束的案件：不承接、已進場、無法進場，或不需追蹤進場的碼別
export function isClosedCase(c) {
  return c.status === '不承接' || !!c.entryDate || !!c.unableToEnter || NO_ENTRY_CODES.includes(c.codeType);
}
