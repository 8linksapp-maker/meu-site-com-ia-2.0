import { useState } from 'react';
import { ThumbsUp, Lightbulb, FileText, Vote, Sparkles, Plus } from 'lucide-react';
import VotingPanel from './VotingPanel';
import MyRequestsPanel from './MyRequestsPanel';
import TemplateRequestForm from '../TemplateRequestForm';

type Tab = 'vote' | 'create' | 'mine';

export default function TemplateCommunityPage() {
    const [tab, setTab] = useState<Tab>('vote');
    const [refreshKey, setRefreshKey] = useState(0);

    function handleSubmittedFromForm() {
        // O form mostra sua própria tela de sucesso. Aqui só forçamos
        // a aba "Minhas" remontar quando o aluno voltar pra ela.
        setRefreshKey(k => k + 1);
    }

    return (
        <div className="max-w-5xl mx-auto">
            {/* Tabs */}
            <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
                <TabButton active={tab === 'vote'} onClick={() => setTab('vote')} icon={ThumbsUp} label="Votar" />
                <TabButton active={tab === 'create'} onClick={() => setTab('create')} icon={Plus} label="Solicitar" />
                <TabButton active={tab === 'mine'} onClick={() => setTab('mine')} icon={FileText} label="Minhas" />
            </div>

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

function TabButton({ active, onClick, icon: Icon, label }: {
    active: boolean; onClick: () => void; icon: React.ElementType; label: string;
}) {
    return (
        <button
            onClick={onClick}
            className={`relative flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors ${
                active ? 'text-[#7c3aed]' : 'text-gray-500 hover:text-gray-800'
            }`}
        >
            <Icon className="w-4 h-4" />
            {label}
            {active && <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#7c3aed] rounded-full" />}
        </button>
    );
}
