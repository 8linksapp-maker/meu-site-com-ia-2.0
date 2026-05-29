import { useState } from 'react';
import { ThumbsUp, FileText, Plus } from 'lucide-react';
import { Tabs } from '../ui';
import type { TabItem } from '../ui';
import VotingPanel from './VotingPanel';
import MyRequestsPanel from './MyRequestsPanel';
import TemplateRequestForm from '../TemplateRequestForm';

type Tab = 'vote' | 'create' | 'mine';

export default function TemplateCommunityPage() {
    const [tab, setTab] = useState<Tab>('vote');
    const [refreshKey, setRefreshKey] = useState(0);

    function handleSubmittedFromForm() {
        // Quando o aluno envia uma solicitação, força "Minhas" remontar quando voltar pra ela.
        setRefreshKey(k => k + 1);
    }

    const tabs: TabItem[] = [
        { id: 'vote', label: 'Votar' },
        { id: 'create', label: 'Solicitar' },
        { id: 'mine', label: 'Minhas' },
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-8">
            <div>
                <h1 className="font-display text-3xl md:text-[2rem] font-normal text-carvao-quente tracking-tight">
                    Comunidade
                </h1>
                <p className="text-base text-cafe-medio mt-1.5">
                    Vote nos próximos templates da plataforma, sugira novos ou acompanhe suas solicitações.
                </p>
            </div>

            <Tabs items={tabs} activeId={tab} onChange={(id) => setTab(id as Tab)} />

            {tab === 'vote' && <VotingPanel />}
            {tab === 'create' && (
                <div onClick={handleSubmittedFromForm}>
                    <TemplateRequestForm />
                </div>
            )}
            {tab === 'mine' && <MyRequestsPanel key={refreshKey} onGoToCreate={() => setTab('create')} />}
        </div>
    );
}
