export default function StatusDot({ status }) {
  const config = {
    ALIGNED: { color: 'status-dot-aligned', label: 'Aligned' },
    OVERCONFIDENT: { color: 'status-dot-overconfident', label: 'Overconfident' },
    UNDERCONFIDENT: { color: 'status-dot-underconfident', label: 'Underconfident' },
    WEAK_ALIGNED: { color: 'status-dot-weak', label: 'Weak' },
    PRELIMINARY: { color: 'status-dot-insufficient', label: 'Preliminary' },
    INSUFFICIENT_DATA: { color: 'status-dot-insufficient', label: 'No Data' },
  };

  const c = config[status] || config.INSUFFICIENT_DATA;

  return (
    <div className="flex items-center gap-1.5">
      <div className={`status-dot ${c.color}`} />
      <span className="text-label-sm-mono text-on-surface-variant">{c.label}</span>
    </div>
  );
}
