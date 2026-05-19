import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface AdminFooterProps {
  appName: string;
  version: string;
  buildDate: string;
}

type Status = 'checking' | 'ok' | 'down';

const POLL_INTERVAL_MS = 60_000;
const PING_TIMEOUT_MS = 5_000;

export default function AdminFooter({ appName, version, buildDate }: AdminFooterProps) {
  const [status, setStatus] = useState<Status>('checking');
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const ping = async () => {
    try {
      const result = await Promise.race([
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .limit(1),
        new Promise<{ error: Error }>((resolve) => {
          setTimeout(() => resolve({ error: new Error('timeout') }), PING_TIMEOUT_MS);
        }),
      ]);

      if ('error' in result && result.error) {
        setStatus('down');
      } else {
        setStatus('ok');
      }
    } catch {
      setStatus('down');
    } finally {
      setLastCheckedAt(new Date());
    }
  };

  useEffect(() => {
    ping();
    intervalRef.current = setInterval(ping, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const dotColor =
    status === 'ok'
      ? 'bg-green-500'
      : status === 'down'
      ? 'bg-red-500'
      : 'bg-gray-300';

  const ariaLabel =
    status === 'ok'
      ? 'Supabase conectado'
      : status === 'down'
      ? 'Supabase desconectado'
      : 'Verificando Supabase';

  const titleText = lastCheckedAt
    ? `${ariaLabel} · ultimo ping ${lastCheckedAt.toLocaleTimeString('pt-BR')}`
    : ariaLabel;

  return (
    <footer
      className="h-10 px-4 lg:px-8 bg-white border-t border-gray-100 flex justify-between items-center gap-3 text-xs text-gray-600 shrink-0 transition-colors duration-200 hover:text-gray-700"
      role="contentinfo"
    >
      <div className="flex items-center gap-1.5 truncate min-w-0">
        <span className="font-medium text-gray-700">{appName}</span>
        <span aria-hidden="true" className="hidden sm:inline text-gray-400">·</span>
        <span className="hidden sm:inline">v{version}</span>
        <span aria-hidden="true" className="hidden sm:inline text-gray-400">·</span>
        <span className="hidden sm:inline truncate">Atualizado em {buildDate}</span>
      </div>
      <div
        className="flex items-center shrink-0"
        role="img"
        aria-label={ariaLabel}
        title={titleText}
      >
        <span
          className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${dotColor} ${
            status === 'checking' ? 'animate-pulse motion-reduce:animate-none' : ''
          }`}
          aria-hidden="true"
        />
      </div>
    </footer>
  );
}
