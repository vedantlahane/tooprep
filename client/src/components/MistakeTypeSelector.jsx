const MISTAKE_TYPES = [
  { value: 'CONCEPTUAL', label: 'Conceptual', icon: 'psychology' },
  { value: 'CALCULATION', label: 'Calculation', icon: 'calculate' },
  { value: 'MISREAD', label: 'Misread', icon: 'visibility_off' },
  { value: 'SILLY_MISTAKE', label: 'Silly Mistake', icon: 'sentiment_frustrated' },
  { value: 'GUESS', label: 'Guessed', icon: 'casino' },
  { value: 'TIME_PRESSURE', label: 'Time Pressure', icon: 'timer_off' },
  { value: 'UNKNOWN', label: 'Not Sure', icon: 'help' },
];

export default function MistakeTypeSelector({ value, onChange }) {
  return (
    <div className="space-y-2">
      <p className="text-label-sm-mono text-on-surface-variant">What went wrong? (optional)</p>
      <div className="flex flex-wrap gap-2">
        {MISTAKE_TYPES.map(type => (
          <button
            key={type.value}
            onClick={() => onChange(value === type.value ? null : type.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-body-md transition-all duration-150 ${
              value === type.value
                ? 'bg-error-container/20 border-error text-error'
                : 'bg-surface-container-lowest border-outline-variant/50 text-on-surface-variant hover:border-primary/50'
            }`}
          >
            <span className="material-symbols-outlined text-base">{type.icon}</span>
            {type.label}
          </button>
        ))}
      </div>
    </div>
  );
}
