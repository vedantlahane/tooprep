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
    <div className="space-y-3">
      <p className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest">what went wrong?</p>
      <div className="flex flex-wrap gap-2">
        {MISTAKE_TYPES.map(type => (
          <button
            key={type.value}
            onClick={() => onChange(value === type.value ? null : type.value)}
            className={`flex items-center gap-2 px-4 py-2 border-2 transition-all duration-150 ${
              value === type.value
                ? 'bg-error border-error text-white'
                : 'bg-surface-dim border-outline-variant text-on-surface hover:border-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">{type.icon}</span>
            <span className="lowercase text-body-md font-semibold">{type.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
