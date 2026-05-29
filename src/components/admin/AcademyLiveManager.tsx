import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Radio, Save, Loader2, UploadCloud, Trash2, Info, ExternalLink, ArrowRight,
} from 'lucide-react';
import PageHeader from '../ui/admin/PageHeader';
import { Card, Banner, Field, Input, Textarea } from '../ui';

/**
 * AcademyLiveManager — apenas configura a PRÓXIMA live ao vivo
 * (platform_settings.next_live_*). Replays vivem na trilha `aulas-ao-vivo`
 * dentro de TrailsManager (/admin/aulas).
 */
export default function AcademyLiveManager() {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [description, setDescription] = useState('');
    const [link, setLink] = useState('');
    const [thumb, setThumb] = useState('');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingThumb, setUploadingThumb] = useState(false);
    const [status, setStatus] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try {
            const { data } = await supabase
                .from('platform_settings')
                .select('next_live_title, next_live_date, next_live_description, next_live_thumb, next_live_link')
                .eq('id', 1)
                .maybeSingle();
            if (data) {
                setTitle(data.next_live_title || '');
                setDate(data.next_live_date ? new Date(data.next_live_date).toISOString().slice(0, 16) : '');
                setDescription(data.next_live_description || '');
                setThumb(data.next_live_thumb || '');
                setLink(data.next_live_link || '');
            }
        } finally {
            setLoading(false);
        }
    }

    async function handleThumbUpload(file: File) {
        setUploadingThumb(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Não autenticado');
            const formData = new FormData();
            formData.append('file', file);
            formData.append('prefix', 'thumb-live');
            const res = await fetch('/api/admin/upload-image', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
                body: formData,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setThumb(data.url);
        } catch (e: unknown) {
            alert('Upload: ' + (e instanceof Error ? e.message : 'falhou'));
        } finally {
            setUploadingThumb(false);
        }
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setStatus(null);
        try {
            const { error } = await supabase.from('platform_settings').upsert({
                id: 1,
                next_live_title: title.trim() || null,
                next_live_date: date ? new Date(date).toISOString() : null,
                next_live_description: description.trim() || null,
                next_live_thumb: thumb.trim() || null,
                next_live_link: link.trim() || null,
            });
            if (error) throw error;
            setStatus({ kind: 'success', msg: 'Salvo. A próxima live já tá visível pra todos os alunos.' });
            setTimeout(() => setStatus(null), 4000);
        } catch (e: unknown) {
            setStatus({ kind: 'error', msg: e instanceof Error ? e.message : 'Erro ao salvar' });
        } finally {
            setSaving(false);
        }
    }

    async function handleClear() {
        if (!confirm('Limpar próxima live? Vai sumir do dashboard dos alunos.')) return;
        setSaving(true);
        try {
            await supabase.from('platform_settings').upsert({
                id: 1,
                next_live_title: null,
                next_live_date: null,
                next_live_description: null,
                next_live_thumb: null,
                next_live_link: null,
            });
            setTitle('');
            setDate('');
            setDescription('');
            setThumb('');
            setLink('');
            setStatus({ kind: 'success', msg: 'Próxima live limpa. Aluno cai no fallback "Sexta 19h".' });
            setTimeout(() => setStatus(null), 4000);
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-coral-terra" />
                <p className="text-cafe-medio text-sm">Carregando configuração…</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-3xl pb-8">
            <PageHeader
                icon={<Radio className="w-5 h-5" />}
                title="Próxima aula ao vivo"
                tagline="Configura o que aparece no dashboard como próxima live agendada."
            />

            {/* Aviso sobre replays */}
            <Banner tone="info" icon={<Info className="w-5 h-5" />}>
                <span>
                    <strong>Replays não vivem aqui.</strong> Eles agora são lessons da trilha{' '}
                    <code className="font-mono bg-cream-surface px-1.5 py-0.5 rounded text-xs">aulas-ao-vivo</code>
                    {' '}em{' '}
                    <a href="/admin/aulas" className="font-semibold text-coral-terra hover:text-terracota-profundo underline">
                        /admin/aulas
                    </a>
                    . Após cada live, adicione lá.
                </span>
            </Banner>

            <Card padding="lg">
                <form onSubmit={handleSave} className="space-y-5">
                    <Field label="Título da live" htmlFor="live-title">
                        <Input
                            id="live-title"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Ex: Lançamento template Sushi Bar + Q&A"
                            maxLength={120}
                        />
                    </Field>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Data e hora" htmlFor="live-date" helper="Padrão MSIA: sexta às 19h BRT.">
                            <input
                                id="live-date"
                                type="datetime-local"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="w-full bg-cream-surface text-carvao-quente text-base font-normal rounded-[12px] px-4 py-3 border border-borda-cafe focus:border-coral-terra focus:outline-none transition-colors min-h-[44px]"
                            />
                        </Field>
                        <Field label="Link (YouTube / Zoom)" htmlFor="live-link">
                            <Input
                                id="live-link"
                                type="url"
                                value={link}
                                onChange={e => setLink(e.target.value)}
                                placeholder="https://youtube.com/watch?v=…"
                            />
                        </Field>
                    </div>

                    <Field label="Descrição curta" htmlFor="live-description" optional helper="Aparece embaixo do título no dashboard.">
                        <Textarea
                            id="live-description"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="O que será abordado nessa aula…"
                            rows={3}
                        />
                    </Field>

                    <Field label="Thumbnail" htmlFor="live-thumb" optional helper="Aparece em /aulas-ao-vivo. 1280×720 ideal.">
                        {thumb ? (
                            <div className="relative">
                                <img src={thumb} alt="" className="w-full max-h-48 object-cover rounded-[10px] border border-borda-cafe" />
                                <button
                                    type="button"
                                    onClick={() => setThumb('')}
                                    className="absolute top-2 right-2 inline-flex items-center gap-1 bg-cream-surface/95 text-vermelho-tijolo hover:bg-[oklch(94%_0.025_28)] px-2.5 py-1 rounded-md text-xs font-semibold"
                                >
                                    <Trash2 className="w-3 h-3" /> Remover
                                </button>
                            </div>
                        ) : uploadingThumb ? (
                            <div className="flex items-center justify-center gap-2 h-24 bg-cream-elevated border border-dashed border-borda-cafe rounded-[10px]">
                                <Loader2 className="w-4 h-4 animate-spin text-coral-terra" />
                                <span className="text-sm text-cafe-medio">Enviando…</span>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center gap-2 h-24 bg-cream-elevated hover:bg-coral-wash border border-dashed border-borda-cafe hover:border-coral-terra/40 rounded-[10px] cursor-pointer transition-colors">
                                <UploadCloud className="w-5 h-5 text-cafe-cinza-quente" />
                                <span className="text-xs font-semibold text-cafe-medio">Clique pra enviar imagem</span>
                                <input
                                    id="live-thumb"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={e => { const f = e.target.files?.[0]; if (f) handleThumbUpload(f); }}
                                />
                            </label>
                        )}
                    </Field>

                    {status && (
                        <Banner tone={status.kind === 'success' ? 'success' : 'error'}>
                            {status.msg}
                        </Banner>
                    )}

                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-borda-cafe">
                        <button
                            type="button"
                            onClick={handleClear}
                            disabled={saving}
                            className="inline-flex items-center gap-2 text-vermelho-tijolo hover:bg-[oklch(94%_0.025_28)] px-3 py-2 rounded-[10px] font-semibold text-sm transition-colors disabled:opacity-50"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Limpar próxima live
                        </button>

                        <div className="flex items-center gap-3">
                            <a
                                href="/aulas"
                                className="inline-flex items-center gap-1.5 text-cafe-medio hover:text-coral-terra font-semibold text-sm transition-colors"
                            >
                                Ver na home
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <button
                                type="submit"
                                disabled={saving}
                                className="inline-flex items-center gap-2 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-5 py-2.5 rounded-[10px] font-semibold text-sm transition-colors active:scale-[0.98] disabled:opacity-60 min-h-[44px]"
                            >
                                {saving ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</>
                                ) : (
                                    <><Save className="w-4 h-4" /> Salvar</>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </Card>

            {/* Atalho útil */}
            <Card padding="md">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-coral-wash flex items-center justify-center shrink-0">
                        <Radio className="w-5 h-5 text-coral-terra" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-display text-lg font-normal text-carvao-quente tracking-tight">
                            Acabou a live? Hora de adicionar o replay
                        </p>
                        <p className="text-sm text-cafe-medio mt-1 leading-relaxed">
                            Vá em <strong>/admin/aulas</strong>, abra a trilha{' '}
                            <code className="font-mono bg-cream-elevated px-1 py-0.5 rounded text-xs">aulas-ao-vivo</code>
                            {' '}e adicione uma nova aula com o vídeo da gravação.
                            Aparece automaticamente em <strong>/aulas-ao-vivo</strong> pra todos os alunos.
                        </p>
                        <a
                            href="/admin/aulas"
                            className="inline-flex items-center gap-2 mt-3 bg-cream-elevated hover:bg-coral-wash text-carvao-quente hover:text-terracota-profundo border border-borda-cafe px-4 py-2 rounded-[10px] font-semibold text-xs transition-colors min-h-[36px]"
                        >
                            Abrir TrailsManager
                            <ArrowRight className="w-3 h-3" />
                        </a>
                    </div>
                </div>
            </Card>
        </div>
    );
}
