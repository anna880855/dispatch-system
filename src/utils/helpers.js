export function today() {
  return new Date().toISOString().slice(0, 10);
}

// Taiwan national holidays (YYYY-MM-DD). Weekends are always excluded separately.
const TW_HOLIDAYS = new Set([
  // 2024
  '2024-01-01','2024-02-08','2024-02-09','2024-02-10','2024-02-11','2024-02-12','2024-02-13','2024-02-14',
  '2024-02-28','2024-04-04','2024-04-05','2024-05-01','2024-06-10','2024-09-17','2024-10-10',
  // 2025
  '2025-01-01','2025-01-27','2025-01-28','2025-01-29','2025-01-30','2025-01-31','2025-02-03',
  '2025-02-28','2025-04-03','2025-04-04','2025-05-01','2025-05-30','2025-05-31','2025-10-06','2025-10-10',
  // 2026
  '2026-01-01','2026-02-17','2026-02-18','2026-02-19','2026-02-20','2026-02-21','2026-02-22','2026-02-23',
  '2026-02-27','2026-04-03','2026-04-06','2026-05-01','2026-06-19','2026-09-25','2026-10-09','2026-10-10',
]);

function isHoliday(date) {
  const dow = date.getDay();
  if (dow === 0 || dow === 6) return true;
  const key = date.toISOString().slice(0, 10);
  return TW_HOLIDAYS.has(key);
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

export const REFERRAL_REASONS = ['案家指定', '二輪輪派', '急件處理', '合作單位優先', '加分輪序增加', '其他'];
