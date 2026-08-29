export default function StatusDot({ status }) {
  const config = {
    ALIGNED: { color: 'status-dot-aligned', label: 'Aligned', emoji: '🟢' },
    OVERCONFIDENT: { color: 'status-dot-overconfident', label: 'Overconfident', emoji: '🔴' },
    UNDERCONFIDENT: { color: 'status-dot-underconfident', label: 'Underconfident', emoji: '🔵' },
    WEAK_ALIGNED: { color: 'status-dot-weak', label: 'Weak', emoji: '🟡' },
    PRELIMINARY: { color: 'status-dot-insufficient', label: 'Preliminary', emoji: '⚪' },
    INSUFFICIENT_DATA: { color: 'status-dot-insufficient', label: 'No Data', emoji: '⚪' },
  };

  const c = config[status] || config.INSUFFICIENT_DATA;

  return (
    <div className="flex items-center gap-1.5">
      <div className={`status-dot ${c.color}`} />
      <span className="text-label-sm-mono text-on-surface-variant">{c.label}</span>
    </div>
  );
}
