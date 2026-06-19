export function severityClass(severity) {
  const map = { Warning: 'warning', Critical: 'danger', Low: 'info', Medium: 'warning', High: 'danger' };
  return map[severity] || 'info';
}

export function statusClass(status) {
  const map = {
    Safe: 'success', Online: 'success', Active: 'success',
    Warning: 'warning', Pending: 'warning', Detected: 'warning', Reviewed: 'info',
    Critical: 'danger', Offline: 'secondary',
    Resolved: 'success', 'False Alarm': 'secondary', Inactive: 'secondary'
  };
  return map[status] || 'info';
}
