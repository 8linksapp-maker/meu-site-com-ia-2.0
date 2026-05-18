import { useVotingStreak } from '../../hooks/useVotingStreak';

const TOOLTIP =
    'Sua sequência atual de dias votando. Vote 1× por dia em qualquer proposta pra manter a chama acesa.';

export default function StreakBadge() {
    const streak = useVotingStreak();

    const go = () => {
        window.location.href = '/solicitar-template';
    };

    // Base: garante footprint estavel pra nao causar layout shift entre estados.
    const base =
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors min-w-[80px] h-8 justify-center';

    if (streak.loading) {
        return (
            <div
                aria-hidden="true"
                className="inline-block w-24 h-8 bg-gray-100 rounded-full animate-pulse"
            />
        );
    }

    // Nunca votou — totalVoteDays === 0
    if (streak.totalVoteDays === 0) {
        return (
            <button
                type="button"
                onClick={go}
                title={TOOLTIP}
                className={`${base} bg-violet-50 text-violet-700 border-violet-100 hover:bg-violet-100`}
            >
                <span className="hidden sm:inline">Vote pela 1ª vez · ganhe seu</span>
                <span aria-hidden="true">🔥</span>
                <span className="sm:hidden font-bold">+</span>
            </button>
        );
    }

    // Votou hoje — verde
    if (streak.votedToday) {
        return (
            <button
                type="button"
                onClick={go}
                title={TOOLTIP}
                className={`${base} bg-green-50 text-green-700 border-green-200 hover:bg-green-100`}
            >
                <span aria-hidden="true">🔥</span>
                <span className="tabular-nums font-bold">{streak.currentStreak}</span>
                <span className="hidden sm:inline">dias · ✓ Hoje</span>
            </button>
        );
    }

    // Pendente hoje (streak ativo, ainda nao votou) — laranja pulsante
    if (streak.currentStreak > 0 && !streak.votedToday) {
        return (
            <button
                type="button"
                onClick={go}
                title={TOOLTIP}
                className={`${base} bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100`}
            >
                <span aria-hidden="true" className="animate-pulse">🔥</span>
                <span className="tabular-nums font-bold">{streak.currentStreak}</span>
                <span className="hidden sm:inline">dias · Vote hoje</span>
            </button>
        );
    }

    // Streak quebrado — currentStreak === 0 && totalVoteDays > 0
    return (
        <button
            type="button"
            onClick={go}
            title={TOOLTIP}
            className={`${base} bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100`}
        >
            <span className="hidden sm:inline">Recomeçar</span>
            <span aria-hidden="true">🔥</span>
        </button>
    );
}
