import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, Loader2, LogOut } from 'lucide-react';

const FALLBACK_CHECKOUT_URL = 'https://meusitecomia.com.br'; // TODO confirmar URL

export default function SubscriptionGate() {
    const [visible, setVisible] = useState(false);
    const [checkoutUrl, setCheckoutUrl] = useState(FALLBACK_CHECKOUT_URL);
    const [loggingOut, setLoggingOut] = useState(false);

    useEffect(() => { checkSubscription(); }, []);

    async function checkSubscription() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('profiles')
            .select('subscription_status, role')
            .eq('id', user.id)
            .limit(1);
        const row = Array.isArray(data) ? data[0] : data;

        // Admin nunca é travado.
        if (row?.role === 'admin') return;

        if (row?.subscription_status !== 'active') {
            setVisible(true);
            loadCheckoutUrl();
        }
    }

    async function loadCheckoutUrl() {
        const { data } = await supabase
            .from('platform_settings')
            .select('checkout_url')
            .limit(1)
            .single();
        if (data?.checkout_url) setCheckoutUrl(data.checkout_url);
    }

    function handleSubscribe() {
        window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
    }

    async function handleLogout() {
        setLoggingOut(true);
        await supabase.auth.signOut();
        window.location.href = '/';
    }

    if (!visible) return null;

    return (
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 overflow-y-auto"
            style={{ backgroundColor: 'color-mix(in oklch, var(--color-carvao-quente) 60%, transparent)' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="subscription-gate-title"
        >
            <div className="relative w-full max-w-md my-auto bg-cream-surface rounded-3xl shadow-2xl overflow-hidden border border-cafe-medio/10">
                <div className="px-8 pt-8 pb-7 text-center">
                    <div className="mx-auto mb-5 w-14 h-14 rounded-2xl bg-coral-terra/10 flex items-center justify-center">
                        <Lock className="w-6 h-6 text-coral-terra" />
                    </div>

                    <h2
                        id="subscription-gate-title"
                        className="font-display text-2xl font-bold text-carvao-quente leading-tight mb-3"
                    >
                        Sua assinatura está inativa
                    </h2>

                    <p className="text-sm text-cafe-medio leading-relaxed mb-7">
                        Pra criar e gerenciar seus sites você precisa de um plano ativo. Assine pra liberar a plataforma de novo.
                    </p>

                    <button
                        type="button"
                        onClick={handleSubscribe}
                        className="w-full py-3.5 rounded-2xl font-bold text-sm bg-coral-terra text-cream-surface hover:bg-terracota-profundo transition-colors active:scale-[0.98]"
                    >
                        Assinar um plano
                    </button>

                    <button
                        type="button"
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="mt-4 inline-flex items-center justify-center gap-1.5 text-xs text-cafe-medio/70 hover:text-cafe-medio transition-colors disabled:opacity-60"
                    >
                        {loggingOut ? (
                            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saindo...</>
                        ) : (
                            <><LogOut className="w-3.5 h-3.5" /> Sair da conta</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
