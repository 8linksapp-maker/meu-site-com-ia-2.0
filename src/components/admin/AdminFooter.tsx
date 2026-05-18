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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);

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
      clearTimeout(timeoutId);
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
      className="h-10 px-4 lg:px-8 bg-white border-t border-gray-200 flex justify-between items-center text-xs text-gray-500 shrink-0"
      role="contentinfo"
    >
      <div className="flex items-center gap-2 truncate">
        <span className="font-medium">{appName}</span>
        <span aria-hidden="true">·</span>
        <span>v{version}</span>
        <span aria-hidden="true" className="hidden sm:inline">·</span>
        <span className="hidden sm:inline">Atualizado em {buildDate}</span>
      </div>
      <div
        className="flex items-center gap-2"
        role="status"
        aria-label={ariaLabel}
        title={titleText}
      >
        <span className={`w-2 h-2 rounded-full ${dotColor}`} aria-hidden="true" />
      </div>
    </footer>
  );
}
