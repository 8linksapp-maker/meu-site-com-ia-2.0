import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ArrowRight, Sparkles } from 'lucide-react';

export interface TourStep {
    target: string;
    title: string;
    description: string;
    placement?: 'top' | 'bottom' | 'left' | 'right';
    ctaText?: string;
    navigateTo?: string;
    clickTarget?: boolean;
}

interface Props {
    steps: TourStep[];
    storageKey: string;
    onComplete?: () => void;
}

export default function SpotlightTour({ steps, storageKey, onComplete }: Props) {
    const [active, setActive] = useState(false);
    const [currentStep, setCurrentStep] = useState(() => {
        if (typeof window === 'undefined') return 0;
        const saved = sessionStorage.getItem(`${storageKey}_step`);
        return saved ? parseInt(saved, 10) : 0;
    });
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const hasScrolled = useRef(false);

    // Inicialização
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (localStorage.getItem(storageKey)) return;

        const delay = sessionStorage.getItem(`${storageKey}_step`) ? 800 : 1500;
        const timer = setTimeout(() => setActive(true), delay);
        return () => clearTimeout(timer);
    }, [storageKey]);

    // Atualiza rect (sem scroll — só lê posição)
    const refreshRect = useCallback(() => {
        if (!active || !steps[currentStep]) return;
        const el = document.querySelector(steps[currentStep].target);
        if (el) {
            setTargetRect(el.getBoundingClientRect());
        }
    }, [active, currentStep, steps]);

    // Quando o step muda, scroll pro elemento e aguarda
    useEffect(() => {
        if (!active || !steps[currentStep]) return;
        hasScrolled.current = false;
        setTargetRect(null);

        let attempts = 0;
        const maxAttempts = 20;

        const poller = setInterval(() => {
            attempts++;
            const el = document.querySelector(steps[currentStep].target);

            if (el) {
                clearInterval(poller);
                if (!hasScrolled.current) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    hasScrolled.current = true;
                }
                // Aguarda scroll + animação terminar
                setTimeout(() => {
                    setTargetRect(el.getBoundingClientRect());
                }, 500);
            } else if (attempts >= maxAttempts) {
                clearInterval(poller);
                // Elemento não encontrado — pula step
                if (currentStep < steps.length - 1) {
                    const next = currentStep + 1;
                    setCurrentStep(next);
                    sessionStorage.setItem(`${storageKey}_step`, String(next));
                } else {
                    finish();
                }
            }
        }, 500);

        return () => clearInterval(poller);
    }, [active, currentStep]);

    // Resize/scroll — só atualiza rect, sem scroll
    useEffect(() => {
        if (!targetRect) return;
        window.addEventListener('resize', refreshRect);
        window.addEventListener('scroll', refreshRect, true);
        return () => {
            window.removeEventListener('resize', refreshRect);
            window.removeEventListener('scroll', refreshRect, true);
        };
    }, [targetRect, refreshRect]);

    function finish() {
        localStorage.setItem(storageKey, 'true');
        sessionStorage.removeItem(`${storageKey}_step`);
        setActive(false);
        setTargetRect(null);
        onComplete?.();
    }

    function goNext() {
        const step = steps[currentStep];

        if (step.navigateTo) {
            sessionStorage.setItem(`${storageKey}_step`, String(currentStep + 1));
            window.location.href = step.navigateTo;
            return;
        }

        if (step.clickTarget) {
            const el = document.querySelector(step.target) as HTMLElement;
            if (el) {
                setTargetRect(null);
                setTimeout(() => {
                    el.click();
                    if (currentStep < steps.length - 1) {
                        const next = currentStep + 1;
                        setCurrentStep(next);
                        sessionStorage.setItem(`${storageKey}_step`, String(next));
                    } else {
                        finish();
                    }
                }, 300);
                return;
            }
        }

        if (currentStep < steps.length - 1) {
            const next = currentStep + 1;
            setCurrentStep(next);
            sessionStorage.setItem(`${storageKey}_step`, String(next));
        } else {
            finish();
        }
    }

    if (!active || !targetRect) return null;

    const step = steps[currentStep];
    const placement = step.placement || 'bottom';
    const pad = 10;
    const tw = 340;

    // Tooltip position
    const ts: React.CSSProperties = { position: 'fixed', width: tw, zIndex: 9991 };
    const clampX = (x: number) => Math.max(16, Math.min(x, window.innerWidth - tw - 16));

    if (placement === 'bottom') {
        ts.top = Math.min(targetRect.bottom + pad + 12, window.innerHeight - 240);
        ts.left = clampX(targetRect.left + targetRect.width / 2 - tw / 2);
    } else if (placement === 'top') {
        ts.top = Math.max(16, targetRect.top - pad - 220);
        ts.left = clampX(targetRect.left + targetRect.width / 2 - tw / 2);
    } else if (placement === 'right') {
        ts.top = Math.max(16, targetRect.top + targetRect.height / 2 - 80);
        ts.left = Math.min(targetRect.right + pad + 12, window.innerWidth - tw - 16);
    } else if (placement === 'left') {
        ts.top = Math.max(16, targetRect.top + targetRect.height / 2 - 80);
        ts.left = Math.max(16, targetRect.left - pad - tw - 12);
    }

    const ctaLabel = step.ctaText || (currentStep === steps.length - 1 ? 'Concluir' : 'Próximo');

    return (
        <div className="fixed inset-0 z-[9990]">
            {/* Overlay com recorte */}
            <svg className="fixed inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
                <defs>
                    <mask id="sp-mask">
                        <rect width="100%" height="100%" fill="white" />
                        <rect
                            x={targetRect.left - pad}
                            y={targetRect.top - pad}
                            width={targetRect.width + pad * 2}
                            height={targetRect.height + pad * 2}
                            rx="12"
                            fill="black"
                        />
                    </mask>
                </defs>
                <rect
                    width="100%" height="100%"
                    fill="rgba(0,0,0,0.7)"
                    mask="url(#sp-mask)"
                    style={{ pointerEvents: 'auto' }}
                    onClick={finish}
                />
            </svg>

            {/* Highlight border */}
            <div
                className="fixed pointer-events-none"
                style={{
                    top: targetRect.top - pad,
                    left: targetRect.left - pad,
                    width: targetRect.width + pad * 2,
                    height: targetRect.height + pad * 2,
                    borderRadius: 14,
                    border: '2px solid #7c3aed',
                    boxShadow: '0 0 0 4px rgba(124,58,237,0.15), 0 0 30px rgba(124,58,237,0.2)',
                    animation: 'sp-pulse 2s ease-in-out infinite',
                }}
            />

            {/* Tooltip */}
            <div
                className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
                style={ts}
                onClick={e => e.stopPropagation()}
            >
                <div className="bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-white/80" />
                        <span className="text-white text-xs font-black uppercase tracking-wider">
                            {currentStep + 1} / {steps.length}
                        </span>
                    </div>
                    <button onClick={finish} className="text-white/60 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="px-5 py-4">
                    <h4 className="font-black text-gray-900 text-base mb-1.5">{step.title}</h4>
                    <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
                </div>

                <div className="px-5 pb-4 flex items-center justify-between">
                    <button onClick={finish} className="text-[11px] text-gray-400 hover:text-gray-600 underline">
                        Pular tour
                    </button>
                    <button
                        onClick={goNext}
                        className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-black text-white bg-[#7c3aed] hover:bg-[#6d28d9] transition shadow-lg shadow-purple-500/25"
                    >
                        {ctaLabel}
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex justify-center gap-1.5 pb-3">
                    {steps.map((_, i) => (
                        <div
                            key={i}
                            className={`h-1.5 rounded-full transition-all ${
                                i === currentStep ? 'bg-[#7c3aed] w-5' : i < currentStep ? 'bg-[#7c3aed]/40 w-1.5' : 'bg-gray-200 w-1.5'
                            }`}
                        />
                    ))}
                </div>
            </div>

            <style>{`
                @keyframes sp-pulse {
                    0%, 100% { box-shadow: 0 0 0 4px rgba(124,58,237,0.15), 0 0 30px rgba(124,58,237,0.2); }
                    50% { box-shadow: 0 0 0 6px rgba(124,58,237,0.25), 0 0 40px rgba(124,58,237,0.3); }
                }
            `}</style>
        </div>
    );
}
