export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function daysBetween(d1, d2) {
  const a = new Date(d1); a.setHours(0, 0, 0, 0);
  const b = new Date(d2); b.setHours(0, 0, 0, 0);
  return Math.floor((b - a) / 86400000) + 1;
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
export const CODE_TYPES = ['BA', 'BB', 'BC', 'CA', 'CB', 'CC', 'CD', 'DA01', 'GA', 'SC'];
export const ROTATING_CODES = ['BA', 'DA01'];
export const NO_ENTRY_CODES = ['DA01', 'GA', 'SC'];

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
  SC: ['服務量能已滿', '專業不符', '其他'],
};

export const REFERRAL_REASONS = ['案家指定', '二輪輪派', '急件處理', '合作單位優先', '加分輪序增加', '其他'];
