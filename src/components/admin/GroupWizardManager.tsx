import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Plus,
    Trash2,
    GripVertical,
    Save,
    Smartphone,
    Hash,
    ListFilter,
    CheckCircle,
    Info,
    Layout,
    MessageSquare,
    Download,
    Eye,
    Calendar,
    Users as UsersIcon,
    Settings
} from 'lucide-react';

interface Question {
    id: string;
    question_text: string;
    question_type: 'text' | 'single_choice' | 'multiple_choice';
    options: string[];
    order_index: number;
    is_required: boolean;
}

export default function GroupWizardManager() {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [whatsappUrl, setWhatsappUrl] = useState('');
    const [successTitle, setSuccessTitle] = useState('Tudo pronto! 🚀');
    const [successDesc, setSuccessDesc] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState('');
    const [activeTab, setActiveTab] = useState<'config' | 'results'>('config');
    const [responses, setResponses] = useState<any[]>([]);
    const [fetchError, setFetchError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load WhatsApp URL and Success Messages from platform_settings
            const { data: settings } = await supabase.from('platform_settings').select('whatsapp_group_url, wizard_success_title, wizard_success_description').limit(1).single();
            if (settings) {
                setWhatsappUrl(settings.whatsapp_group_url || '');
                setSuccessTitle(settings.wizard_success_title || 'Tudo pronto! 🚀');
                setSuccessDesc(settings.wizard_success_description || 'Você foi qualificado com sucesso. Clique abaixo para entrar no grupo oficial de alunos.');
            }

            // Load Questions
            const { data: qs } = await supabase
                .from('wizard_questions')
                .select('*')
                .order('order_index', { ascending: true });

            if (qs) {
                setQuestions(qs.map(q => ({
                    ...q,
                    options: Array.isArray(q.options) ? q.options : []
                })));
            }

            // Load Responses (Step 1: Simple fetch without join to avoid PGRST200)
            const { data: resData, error: resError } = await supabase
                .from('wizard_responses')
                .select('*')
                .order('created_at', { ascending: false });

            if (resError) {
                console.error('Erro ao buscar respostas:', resError);
                setFetchError(resError.message);
                setLoading(false);
                return;
            }

            if (resData && resData.length > 0) {
                // Step 2: Fetch ALL users from our Admin API to get Real Emails (Auth)
                let allUsers: any[] = [];
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    const token = session?.access_token;
                    if (token) {
                        const rolesRes = await fetch('/api/admin/users', {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (rolesRes.ok) {
                            allUsers = await rolesRes.json();
                        }
                    }
                } catch (apiErr) {
                    console.error('Erro ao buscar lista de usuários da API:', apiErr);
                }

                // Step 3: Join results in frontend
                const joinedData = resData.map(res => {
                    const authUser = allUsers.find(u => u.id === res.user_id);
                    const name = res.user_name || authUser?.full_name;
                    const email = res.user_email || authUser?.email || 'Sem email';

                    return {
                        ...res,
                        display_name: name || email,
                        display_email: name ? email : null
                    };
                });

                setResponses(joinedData);
            } else {
                setResponses([]);
            }
            setFetchError(null);
        } catch (err) {
            console.error('Erro ao carregar dados:', err);
        } finally {
            setLoading(false);
        }
    };

    const addQuestion = () => {
        const newQ: Question = {
            id: crypto.randomUUID(),
            question_text: '',
            question_type: 'text',
            options: [],
            order_index: questions.length,
            is_required: true
        };
        setQuestions([...questions, newQ]);
    };

    const removeQuestion = (id: string) => {
        setQuestions(questions.filter(q => q.id !== id));
    };

    const updateQuestion = (id: string, updates: Partial<Question>) => {
        setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
    };

    const handleSave = async () => {
        setSaving(true);
        setStatus('Salvando alterações...');
        try {
            // 1. Update Platform Settings (WhatsApp URL & Success Messages)
            const { error: settingsError } = await supabase
                .from('platform_settings')
                .update({
                    whatsapp_group_url: whatsappUrl.trim(),
                    wizard_success_title: successTitle.trim(),
                    wizard_success_description: successDesc.trim()
                })
                .eq('id', (await supabase.from('platform_settings').select('id').limit(1).single()).data?.id);

            if (settingsError) throw settingsError;

            // 2. Sync Questions (Delete removed ones + Upsert current ones)
            const { data: existingQs } = await supabase.from('wizard_questions').select('id');
            const currentIds = questions.map(q => q.id);
            const idsToDelete = existingQs?.filter(eq => !currentIds.includes(eq.id)).map(eq => eq.id) || [];

            if (idsToDelete.length > 0) {
                const { error: delError } = await supabase.from('wizard_questions').delete().in('id', idsToDelete);
                if (delError) throw delError;
            }

            const { error: qsError } = await supabase
                .from('wizard_questions')
                .upsert(
                    questions.map((q, idx) => ({
                        id: q.id,
                        question_text: q.question_text,
                        question_type: q.question_type,
                        options: q.options,
                        order_index: idx,
                        is_required: q.is_required
                    })),
                    { onConflict: 'id' }
                );

            if (qsError) throw qsError;

            setStatus('✅ Configurações salvas com sucesso!');
            setTimeout(() => setStatus(''), 3000);
            await loadData();
        } catch (err: any) {
            setStatus(`❌ Erro ao salvar: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const downloadCSV = () => {
        if (responses.length === 0) return;

        const headers = ['Data', 'Nome', 'Email'];
        questions.forEach(q => headers.push(q.question_text));

        const csvRows = [headers.join(',')];

        responses.forEach(res => {
            const row = [
                new Date(res.created_at).toLocaleDateString('pt-BR'),
                res.profiles?.full_name || 'N/A',
                res.profiles?.email || 'N/A'
            ];

            questions.forEach(q => {
                const answer = res.answers[q.id];
                const answerText = Array.isArray(answer) ? answer.join('; ') : (answer || '');
                row.push(`"${String(answerText).replace(/"/g, '""')}"`);
            });

            csvRows.push(row.join(','));
        });

        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `respostas_wizard_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return <div className="text-center p-12 text-gray-500 animate-pulse">Carregando gerenciador do grupo...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">

            {/* Tabs Trigger */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl w-fit mx-auto shadow-inner">
                <button
                    onClick={() => setActiveTab('config')}
                    className={`px-6 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${activeTab === 'config' ? 'bg-white text-[#7c3aed] shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <div className="flex items-center gap-2">
                        <Settings className="w-3.5 h-3.5" />
                        Configurações
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('results')}
                    className={`px-6 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${activeTab === 'results' ? 'bg-white text-[#7c3aed] shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <div className="flex items-center gap-2">
                        <UsersIcon className="w-3.5 h-3.5" />
                        Resultados ({responses.length})
                    </div>
                </button>
            </div>

            {activeTab === 'config' ? (
                <>
                    {/* Header com Link do whats */}
                    <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-8 overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <MessageSquare className="w-32 h-32 text-[#7c3aed]" />
                        </div>

                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
                                <Smartphone className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-gray-900 tracking-tight">Link do WhatsApp</h2>
                                <p className="text-sm text-gray-500 font-medium">Configure o link oficial que o usuário verá no final do Wizard.</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row gap-4 items-end">
                                <div className="flex-1 w-full space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">URL do Grupo (chat.whatsapp.com...)</label>
                                    <input
                                        type="text"
                                        value={whatsappUrl}
                                        onChange={(e) => setWhatsappUrl(e.target.value)}
                                        placeholder="https://chat.whatsapp.com/Gpx..."
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent transition text-sm font-medium"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-50">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Título de Sucesso (Final)</label>
                                    <input
                                        type="text"
                                        value={successTitle}
                                        onChange={(e) => setSuccessTitle(e.target.value)}
                                        placeholder="Tudo pronto! 🚀"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent transition text-sm font-bold"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Descrição de Sucesso (Final)</label>
                                    <input
                                        type="text"
                                        value={successDesc}
                                        onChange={(e) => setSuccessDesc(e.target.value)}
                                        placeholder="Você foi qualificado com sucesso..."
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent transition text-sm font-medium"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Gerenciador de Perguntas */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2">
                                <ListFilter className="w-5 h-5 text-[#7c3aed]" />
                                <h3 className="text-lg font-black text-gray-900 tracking-tight">Perguntas do Wizard</h3>
                            </div>
                            <button
                                onClick={addQuestion}
                                className="bg-[#7c3aed] text-white px-4 py-2 rounded-xl font-black text-[10px] hover:bg-[#6d28d9] transition-all flex items-center gap-2 shadow-md shadow-purple-200"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                ADICIONAR PERGUNTA
                            </button>
                        </div>

                        <div className="space-y-4">
                            {questions.length === 0 ? (
                                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center">
                                    <Info className="w-10 h-10 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500 font-bold text-sm">Nenhuma pergunta configurada.</p>
                                    <p className="text-gray-400 text-xs mt-1">Clique no botão acima para começar a qualificar seus leads.</p>
                                </div>
                            ) : (
                                questions.map((q, index) => (
                                    <div key={q.id} className="bg-white border border-gray-100 rounded-[28px] p-6 shadow-sm hover:shadow-md transition-shadow group">
                                        <div className="flex gap-6">
                                            <div className="flex flex-col items-center gap-2 pt-1">
                                                <div className="w-10 h-10 bg-gray-900 rounded-2xl text-white flex items-center justify-center font-black text-xs shadow-lg">
                                                    #{index + 1}
                                                </div>
                                                <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors">
                                                    <GripVertical className="w-5 h-5" />
                                                </div>
                                            </div>

                                            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6">
                                                <div className="md:col-span-8 space-y-4">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Texto da Pergunta</label>
                                                        <input
                                                            type="text"
                                                            value={q.question_text}
                                                            onChange={(e) => updateQuestion(q.id, { question_text: e.target.value })}
                                                            placeholder="Qual seu principal objetivo?"
                                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#7c3aed] transition text-sm font-bold"
                                                        />
                                                    </div>

                                                    {(q.question_type === 'single_choice' || q.question_type === 'multiple_choice') && (
                                                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 flex justify-between items-center">
                                                                Alternativas de Resposta
                                                                <button
                                                                    onClick={() => {
                                                                        const newOptions = [...q.options, ''];
                                                                        updateQuestion(q.id, { options: newOptions });
                                                                    }}
                                                                    className="text-[#7c3aed] hover:text-[#6d28d9] flex items-center gap-1 normal-case"
                                                                >
                                                                    <Plus className="w-3 h-3" />
                                                                    Adicionar Opção
                                                                </button>
                                                            </label>

                                                            <div className="grid grid-cols-1 gap-2">
                                                                {q.options.map((opt, optIdx) => (
                                                                    <div key={optIdx} className="flex gap-2 group/opt">
                                                                        <input
                                                                            type="text"
                                                                            value={opt}
                                                                            onChange={(e) => {
                                                                                const newOptions = [...q.options];
                                                                                newOptions[optIdx] = e.target.value;
                                                                                updateQuestion(q.id, { options: newOptions });
                                                                            }}
                                                                            placeholder={`Opção ${optIdx + 1}`}
                                                                            className="flex-1 px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#7c3aed] transition text-sm font-medium"
                                                                        />
                                                                        <button
                                                                            onClick={() => {
                                                                                const newOptions = q.options.filter((_, i) => i !== optIdx);
                                                                                updateQuestion(q.id, { options: newOptions });
                                                                            }}
                                                                            className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover/opt:opacity-100"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="md:col-span-4 space-y-4">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Tipo de Resposta</label>
                                                        <select
                                                            value={q.question_type}
                                                            onChange={(e) => updateQuestion(q.id, { question_type: e.target.value as any })}
                                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#7c3aed] transition text-xs font-bold appearance-none"
                                                        >
                                                            <option value="text">Texto Aberto</option>
                                                            <option value="single_choice">Escolha Única</option>
                                                            <option value="multiple_choice">Múltipla Escolha</option>
                                                        </select>
                                                    </div>

                                                    <div className="flex items-center justify-between gap-4 pt-2">
                                                        <label className="flex items-center gap-2 cursor-pointer group">
                                                            <input
                                                                type="checkbox"
                                                                checked={q.is_required}
                                                                onChange={(e) => updateQuestion(q.id, { is_required: e.target.checked })}
                                                                className="w-5 h-5 rounded-lg border-gray-300 text-[#7c3aed] focus:ring-[#7c3aed]"
                                                            />
                                                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">Obrigatório</span>
                                                        </label>

                                                        <button
                                                            onClick={() => removeQuestion(q.id)}
                                                            className="p-2.5 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                                        >
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Floating Save Status */}
                    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-4">
                        {status && (
                            <div className={`px-6 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 font-bold text-sm ${status.includes('❌') ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                                {status.includes('✅') ? <CheckCircle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                                {status}
                            </div>
                        )}

                        <button
                            onClick={handleSave}
                            disabled={saving || questions.length === 0}
                            className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white px-10 py-4 rounded-[22px] font-black text-sm shadow-[0_15px_30px_-5px_rgba(124,58,237,0.4)] hover:shadow-[0_20px_40px_-5px_rgba(124,58,237,0.5)] transition-all hover:-translate-y-1 active:scale-95 disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed flex items-center gap-3"
                        >
                            <Save className="w-5 h-5" />
                            {saving ? 'SALVANDO ALTERAÇÕES...' : 'SALVAR TODA A ESTRUTURA'}
                        </button>
                    </div>
                </>
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                            <UsersIcon className="w-5 h-5 text-[#7c3aed]" />
                            <h3 className="text-lg font-black text-gray-900 tracking-tight">Leads Qualificados</h3>
                        </div>
                        <button
                            onClick={downloadCSV}
                            className="bg-emerald-500 text-white px-4 py-2 rounded-xl font-black text-[10px] hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-md shadow-emerald-200"
                        >
                            <Download className="w-3.5 h-3.5" />
                            EXPORTAR CSV (.CSV)
                        </button>
                    </div>

                    <div className="bg-white rounded-[28px] border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Data</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Usuário</th>
                                    {questions.map(q => (
                                        <th key={q.id} className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest min-w-[200px]">
                                            {q.question_text}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {responses.length === 0 ? (
                                    <tr>
                                        <td colSpan={3 + questions.length} className="px-6 py-12 text-center text-gray-400 font-medium text-sm">
                                            Nenhuma resposta encontrada ainda.
                                        </td>
                                    </tr>
                                ) : (
                                    responses.map(res => (
                                        <tr key={res.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2 text-gray-500 font-bold text-xs">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(res.created_at).toLocaleDateString('pt-BR')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-900 text-xs">{res.display_name}</span>
                                                    {res.display_email && <span className="text-[10px] text-gray-400 font-medium">{res.display_email}</span>}
                                                </div>
                                            </td>
                                            {questions.map(q => {
                                                const answer = res.answers[q.id];
                                                return (
                                                    <td key={q.id} className="px-6 py-4">
                                                        <div className="flex items-start gap-2">
                                                            <div className="mt-1">
                                                                <Eye className="w-3 h-3 text-gray-300" />
                                                            </div>
                                                            <span className="text-gray-600 text-xs font-medium line-clamp-3">
                                                                {Array.isArray(answer) ? answer.join(', ') : (answer || '-')}
                                                            </span>
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
