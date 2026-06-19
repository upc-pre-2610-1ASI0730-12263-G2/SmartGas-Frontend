export function formatDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleString('en-GB', { hour12: false, dateStyle: 'short', timeStyle: 'short' });
}

export function nowISO() {
  return new Date().toISOString();
}
