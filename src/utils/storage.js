// ==== KLASIFIKASI (CNN) ====
// Disimpan sebagai map: { "<taskId>:<username>": { label, at } }
const KEY_CLASSIFICATIONS = 'classifications';

export function getClassifications() {
  try {
    return JSON.parse(localStorage.getItem(KEY_CLASSIFICATIONS)) || {};
  } catch {
    return {};
  }
}

export function setClassification(taskId, username, label) {
  if (!taskId || !username) return;
  const all = getClassifications();
  const key = `${taskId}:${username}`;
  all[key] = { label, at: Date.now() };
  localStorage.setItem(KEY_CLASSIFICATIONS, JSON.stringify(all));
  // kasih signal biar dashboard/recordings re-render
  window.dispatchEvent(new Event('classifications'));
}

// ==== TASKS ====
const KEY_TASKS = 'tasks';

// Bentuk data: [{ id, title, createdAt, due, status: { [username]: 'done'|'pending'|... } }, ...]
export function getTasks() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY_TASKS));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

// Tambah tugas baru
export function addTask({ title, instruction = '', due = '' }) {
  if (!title || !String(title).trim()) return null;
  const all = getTasks();
  const id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = Date.now();
  const item = { id, title: String(title).trim(), instruction, due, createdAt, status: {} };
  all.push(item);
  localStorage.setItem(KEY_TASKS, JSON.stringify(all));
  window.dispatchEvent(new Event('tasks'));
  return item;
}

// ==== RECORDINGS ====
const KEY_RECORDINGS = 'recordings';

// Bentuk data: [{ id, username, fileName, mime, dataUrl, taskId, createdAt }, ...]
export function getRecordings() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY_RECORDINGS));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function addRecording(rec) {
  // rec: { username, fileName, mime, dataUrl, taskId|null }
  const all = getRecordings();
  const id = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = Date.now();
  const item = { id, createdAt, ...rec };
  all.push(item);
  localStorage.setItem(KEY_RECORDINGS, JSON.stringify(all));
  window.dispatchEvent(new Event('recordings'));
  return item;
}

// ==== USERS ====
const KEY_USERS = 'users';

// Bentuk data: [{ username, role }, ...]
export function getUsers() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY_USERS));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}