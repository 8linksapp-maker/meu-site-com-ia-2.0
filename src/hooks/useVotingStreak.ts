import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getTodayBR } from '../lib/dateBR';

export interface StreakState {
    currentStreak: number;
    longestStreak: number;
    lastVoteDate: string | null;
    totalVoteDays: number;
    loading: boolean;
    error: string | null;
}

const INITIAL: StreakState = {
    currentStreak: 0,
    longestStreak: 0,
    lastVoteDate: null,
    totalVoteDays: 0,
    loading: true,
    error: null,
};

const ANON: StreakState = {
    currentStreak: 0,
    longestStreak: 0,
    lastVoteDate: null,
    totalVoteDays: 0,
    loading: false,
    error: null,
};

export interface UseVotingStreakReturn extends StreakState {
    votedToday: boolean;
    refetch: () => Promise<StreakState>;
}

// Hook que le sessao + chama RPC get_user_voting_streak.
// Sem refetch automatico — VotingPanel chama refetch() explicito apos toggleVote.
// refetch() devolve o novo estado pra evitar bug de closure (state.currentStreak
// no closure ainda apontaria pro valor antigo logo apos setState).
export function useVotingStreak(): UseVotingStreakReturn {
    const [state, setState] = useState<StreakState>(INITIAL);

    const fetchStreak = useCallback(async (): Promise<StreakState> => {
        setState((s) => ({ ...s, loading: true, error: null }));

        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;
        if (!session) {
            setState(ANON);
            return ANON;
        }

        const { data, error } = await supabase.rpc('get_user_voting_streak', {
            p_user_id: session.user.id,
        });

        if (error) {
            const next: StreakState = {
                currentStreak: 0,
                longestStreak: 0,
                lastVoteDate: null,
                totalVoteDays: 0,
                loading: false,
                error: error.message,
            };
            setState(next);
            return next;
        }

        const row = Array.isArray(data) ? data[0] : data;
        const next: StreakState = {
            currentStreak: row?.current_streak ?? 0,
            longestStreak: row?.longest_streak ?? 0,
            lastVoteDate: row?.last_vote_date ?? null,
            totalVoteDays: row?.total_vote_days ?? 0,
            loading: false,
            error: null,
        };
        setState(next);
        return next;
    }, []);

    useEffect(() => {
        fetchStreak();
    }, [fetchStreak]);

    const votedToday = state.lastVoteDate === getTodayBR();

    return { ...state, votedToday, refetch: fetchStreak };
}
