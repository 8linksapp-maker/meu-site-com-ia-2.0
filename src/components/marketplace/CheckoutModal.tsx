import { useState, useEffect } from 'react';
import { X, Mail, Download, CreditCard, Loader2, CheckCircle } from 'lucide-react';
import { formatBRL } from '../../lib/marketplace';
import type { Listing } from '../../lib/marketplace-types';
import { supabase } from '../../lib/supabase';
import TOSCheckbox from './TOSCheckbox';

interface Props {
  listing: Listing;
  onClose: () => void;
}

type Step = 'email' | 'processing' | 'success' | 'error';

export default function CheckoutModal({ listing, onClose }: Props) {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<Step>('email');
  const [errorMsg, setErrorMsg] = useState('');
  const isFree = listing.price_cents === 0;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) setEmail(session.user.email);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStep('processing');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

      const res = await fetch('/api/marketplace/checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify({ listing_id: listing.id, buyer_email: email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Erro ao processar. Tente novamente.');
        setStep('error');
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        setStep('success');
      }
    } catch {
      setErrorMsg('Erro de conexão. Tente novamente.');
      setStep('error');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="font-bold text-gray-900 text-lg leading-snug">{listing.title}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {isFree ? 'Download gratuito' : formatBRL(listing.price_cents)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'email' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="buyer-email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Seu e-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  id="buyer-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30 focus:border-[#7c3aed] transition-colors"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                {isFree
                  ? 'O link de download será enviado para esse e-mail.'
                  : 'O link de download chegará nesse e-mail após o pagamento.'}
              </p>
            </div>

            {/* TOS */}
            <TOSCheckbox />

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-bold py-3 rounded-xl transition-colors text-sm shadow-md shadow-purple-500/20"
            >
              {isFree ? (
                <>
                  <Download className="w-4 h-4" />
                  Baixar Grátis
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Ir para Pagamento
                </>
              )}
            </button>
          </form>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center py-10 gap-3">
            <Loader2 className="w-8 h-8 text-[#7c3aed] animate-spin" />
            <p className="text-sm text-gray-500">Processando...</p>
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center py-10 gap-3 text-center">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
            <p className="font-bold text-gray-900">Tudo certo!</p>
            <p className="text-sm text-gray-500">
              O link de download foi enviado para <strong>{email}</strong>.
            </p>
            <button
              onClick={onClose}
              className="mt-2 text-sm text-[#7c3aed] font-semibold hover:underline"
            >
              Fechar
            </button>
          </div>
        )}

        {step === 'error' && (
          <div className="flex flex-col items-center py-10 gap-3 text-center">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <X className="w-5 h-5 text-red-600" />
            </div>
            <p className="font-bold text-gray-900">Algo deu errado</p>
            <p className="text-sm text-gray-500">{errorMsg}</p>
            <button
              onClick={() => setStep('email')}
              className="mt-2 text-sm text-[#7c3aed] font-semibold hover:underline"
            >
              Tentar novamente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
