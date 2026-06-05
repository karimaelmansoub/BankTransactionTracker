export function timeAgo(iso) {
  if (!iso) return '–';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function fmtDate(iso) {
  if (!iso) return '–';
  return new Date(iso).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' });
}

export function intervalLabel(m) { return m === 60 ? '1h' : `${m}m`; }

export function statusBadge(status) {
  if (!status || status === 'pending') return `<span class="badge badge-gray">Pending</span>`;
  const s = status.toLowerCase();
  if (s.includes('credited') || s === 'changed') return `<span class="badge badge-green">${status}</span>`;
  if (s.includes('progress') || s === 'processing') return `<span class="badge badge-yellow">${status}</span>`;
  if (s.includes('error') || s.includes('failed') || s.includes('rejected')) return `<span class="badge badge-red">${status}</span>`;
  if (s === 'no change') return `<span class="badge badge-gray">No change</span>`;
  if (s.includes('unavailable') || s === 'unknown') return `<span class="badge badge-blue">${status}</span>`;
  return `<span class="badge badge-gray">${status}</span>`;
}
