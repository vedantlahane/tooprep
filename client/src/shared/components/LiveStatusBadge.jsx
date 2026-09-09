import { useState } from 'react';
import { useRealtimeStatus } from '../lib/realtimeSync';

export default function LiveStatusBadge() {
  const { status, pingMs } = useRealtimeStatus();
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';

  return (
    <div
      className="relative flex items-center select-none"
      onMouseEnter={() => setTooltipOpen(true)}
      onMouseLeave={() => setTooltipOpen(false)}
      onClick={() => setTooltipOpen(prev => !prev)}
    >
      <div
        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-mono font-bold tracking-widest uppercase transition-all duration-300 cursor-pointer ${
          isConnected
            ? 'bg-status-aligned/10 border-status-aligned/30 text-status-aligned hover:bg-status-aligned/20'
            : isConnecting
            ? 'bg-status-weak/10 border-status-weak/30 text-status-weak animate-pulse'
            : 'bg-white/5 border-white/10 text-white/40'
        }`}
      >
        {/* Pulsing indicator light */}
        <span className="relative flex h-2 w-2">
          {isConnected && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-aligned opacity-75"></span>
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              isConnected
                ? 'bg-status-aligned'
                : isConnecting
                ? 'bg-status-weak'
                : 'bg-white/30'
            }`}
          ></span>
        </span>

        <span className="hidden sm:inline">
          {isConnected ? 'LIVE' : isConnecting ? 'SYNCING' : 'OFFLINE'}
        </span>
        {isConnected && (
          <span className="text-[9px] opacity-70 font-light hidden md:inline">
            {pingMs}ms
          </span>
        )}
      </div>

      {/* Hover / click tooltip */}
      {tooltipOpen && (
        <div className="absolute top-full right-0 mt-2 z-50 w-52 p-2.5 bg-neutral-950/95 backdrop-blur-md border border-white/15 rounded shadow-2xl text-[11px] font-mono space-y-1.5 animate-fade-in">
          <div className="flex items-center justify-between border-b border-white/10 pb-1 text-white/80 font-bold">
            <span>BACKEND SYNC</span>
            <span className={isConnected ? 'text-status-aligned' : 'text-status-weak'}>
              {status.toUpperCase()}
            </span>
          </div>
          <div className="text-[10px] text-white/60 space-y-1">
            <div className="flex justify-between">
              <span>Channel:</span>
              <span className="text-white/90">WebSockets</span>
            </div>
            <div className="flex justify-between">
              <span>Latency:</span>
              <span className="text-status-aligned font-bold">{pingMs} ms</span>
            </div>
            <div className="flex justify-between">
              <span>Replication:</span>
              <span className="text-white/90">Postgres CDC</span>
            </div>
          </div>
          <p className="text-[9px] text-white/40 pt-1 border-t border-white/10 italic">
            Instant live updates without page refreshing.
          </p>
        </div>
      )}
    </div>
  );
}
