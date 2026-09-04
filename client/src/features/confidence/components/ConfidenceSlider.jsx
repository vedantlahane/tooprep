import { useState } from 'react';
import { motion } from 'framer-motion';

export default function ConfidenceSlider({ value, onChange, disabled = false }) {
  const [hover, setHover] = useState(null);

  const display = hover ?? value;

  const getColor = (v) => {
    if (v <= 3) return 'bg-error';
    if (v <= 5) return 'bg-status-weak';
    if (v <= 7) return 'bg-primary-container';
    return 'bg-tertiary-container';
  };

  const getLabel = (v) => {
    if (!v) return 'Not rated';
    if (v <= 2) return 'Very Low';
    if (v <= 4) return 'Low';
    if (v <= 6) return 'Moderate';
    if (v <= 8) return 'High';
    return 'Very High';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-label-sm-mono text-on-surface-variant">
          {getLabel(display)}
        </span>
        <span className="text-headline-md text-primary font-bold">
          {display || '—'}/10
        </span>
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
          <motion.button
            key={n}
            type="button"
            disabled={disabled}
            whileHover={{ scale: disabled ? 1 : 1.12, y: disabled ? 0 : -2 }}
            whileTap={{ scale: disabled ? 1 : 0.92 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onChange(n)}
            className={`flex-1 h-10 rounded transition-colors duration-150 border text-label-mono font-bold
              ${n <= (display || 0)
                ? `${getColor(display)} text-white border-transparent shadow-sm`
                : 'bg-surface-container-low text-on-surface-variant border-outline-variant/50 hover:border-primary/50'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {n}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
