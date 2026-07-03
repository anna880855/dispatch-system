// Firebase REST API（不需 SDK，直接用 fetch）
const FB_URL = 'https://seniorlifeot-case-system-default-rtdb.asia-southeast1.firebasedatabase.app';

export async function fbGet(path) {
  try {
    const r = await fetch(`${FB_URL}/${path}.json`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (e) {
    console.warn('fbGet失敗:', e.message);
    return null;
  }
}

export async function fbSet(path, val) {
  try {
    const r = await fetch(`${FB_URL}/${path}.json`, {
      method: 'PUT',
      body: JSON.stringify(val),
      headers: { 'Content-Type': 'application/json' }
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (e) {
    console.warn('fbSet失敗:', e.message);
    return null;
  }
}

export async function fbUpdate(path, val) {
  try {
    const r = await fetch(`${FB_URL}/${path}.json`, {
      method: 'PATCH',
      body: JSON.stringify(val),
      headers: { 'Content-Type': 'application/json' }
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (e) {
    console.warn('fbUpdate失敗:', e.message);
    return null;
  }
}

export async function fbRemove(path) {
  try {
    await fetch(`${FB_URL}/${path}.json`, { method: 'DELETE' });
  } catch (e) {
    console.warn('fbRemove失敗:', e.message);
  }
}

// 輕量連線探測，跟資料讀取脫鉤，避免把「沒有資料」誤判為「離線」
export async function fbPing() {
  try {
    const r = await fetch(`${FB_URL}/.json?shallow=true`);
    return r.ok;
  } catch (e) {
    return false;
  }
}

export function objToArr(obj) {
  if (!obj || typeof obj !== 'object') return [];
  return Object.values(obj);
}

export function arrToObj(arr) {
  const o = {};
  arr.forEach(i => { if (i && i.id) o[i.id] = i; });
  return o;
}
