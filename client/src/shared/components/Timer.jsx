import { useState, useEffect, useRef } from 'react';
import { Timer as TimerIcon } from 'lucide-react';

export default function Timer({ durationSeconds, onExpire, running = true }) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!running) return;

    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          onExpire?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [running, onExpire]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const isUrgent = remaining <= 60;
  const isWarning = remaining <= 300 && !isUrgent;

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-sm border font-mono ${
      isUrgent
        ? 'bg-error-container/20 border-error text-error timer-urgent'
        : isWarning
        ? 'bg-status-weak/10 border-status-weak text-status-weak'
        : 'bg-surface-container-low border-outline-variant text-on-surface'
    }`}>
      <TimerIcon className="w-5 h-5 flex-shrink-0" />
      <span className="text-headline-md font-bold tabular-nums">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </div>
  );
}
