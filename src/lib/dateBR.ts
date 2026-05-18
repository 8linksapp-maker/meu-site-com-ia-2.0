// Hoje em horário de Brasília (UTC-3, sem DST).
// Usado pra constraint de "1 voto por dia" e pra derivar votedToday no streak.
export function getTodayBR(): string {
    const now = new Date();
    const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    return brt.toISOString().slice(0, 10);
}
