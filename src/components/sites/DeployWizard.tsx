import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, Banner, Field, Input } from '../ui';
import {
    ArrowLeft, ArrowRight, Loader2, CheckCircle2,
    ExternalLink, LayoutDashboard, Rocket, AlertCircle
} from 'lucide-react';

interface Template {
    id: string;
    name: string;
    image_url: string | null;
    description?: string | null;
    repo?: string;
}

interface DeployWizardProps {
    templateId: string;
}

type Phase = 'idle' | 'deploying' | 'success' | 'error';

export default function DeployWizard({ templateId }: DeployWizardProps) {
    const [templateLoading, setTemplateLoading] = useState(true);
    const [template, setTemplate] = useState<Template | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [hasTokens, setHasTokens] = useState<boolean | null>(null);
    const [githubToken, setGithubToken] = useState<string | null>(null);
    const [vercelToken, setVercelToken] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);

    const [repoName, setRepoName] = useState('');
    const [adminPassword, setAdminPassword] = useState('');

    const [phase, setPhase] = useState<Phase>('idle');
    const [statusMsg, setStatusMsg] = useState('');
    const [deployedUrl, setDeployedUrl] = useState('');
    const [errorRefCode, setErrorRefCode] = useState<string | null>(null);

    useEffect(() => { loadAll(); }, [templateId]);

    async function loadAll() {
        setTemplateLoading(true);
        setLoadError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoadError('Sessão expirada. Faça login novamente.');
                setTemplateLoading(false);
                return;
            }
            setUserId(user.id);
            setUserEmail(user.email ?? null);

            const [templateResult, profileResult] = await Promise.all([
                supabase.from('templates').select('*').eq('id', templateId).maybeSingle(),
                supabase.from('profiles').select('github_token, vercel_token').eq('id', user.id).maybeSingle(),
            ]);

            if (templateResult.error || !templateResult.data) {
                setLoadError('Esse template não foi encontrado.');
            } else {
                setTemplate(templateResult.data as Template);
            }

            const profile = profileResult.data;
            const gh = profile?.github_token ?? null;
            const vc = profile?.vercel_token ?? null;
            setGithubToken(gh);
            setVercelToken(vc);
            setHasTokens(!!(gh && vc));
        } catch (err: unknown) {
            setLoadError(err instanceof Error ? err.message : 'Erro carregando template.');
        } finally {
            setTemplateLoading(false);
        }
    }

    async function handleDeploy(e: FormEvent) {
        e.preventDefault();
        if (!template || !userId || !githubToken || !vercelToken) return;

        setPhase('deploying');
        setStatusMsg('Iniciando deploy…');
        setErrorRefCode(null);

        try {
            const res = await fetch('/api/deploy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    templateRepo: template.repo,
                    templateId: template.id,
                    templateName: template.name,
                    newRepoName: repoName,
                    adminPassword,
                    githubToken,
                    vercelToken,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro no deploy.');

            setStatusMsg('Repositório criado. Construindo o site na Vercel…');

            if (data.deploymentId) {
                let pollCount = 0;
                const MAX_POLLS = 45; // 45 × 4s = 3min de timeout
                const pollInterval = setInterval(async () => {
                    pollCount++;
                    if (pollCount > MAX_POLLS) {
                        clearInterval(pollInterval);
                        setStatusMsg('O deploy está demorando mais que o normal. Verifique em "Meus Sites" daqui a alguns minutos.');
                        setPhase('idle');
                        return;
                    }
                    try {
                        const checkRes = await fetch('/api/check-deploy', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                deploymentId: data.deploymentId,
                                vercelToken,
                                userId,
                                userEmail,
                                templateId: template.id,
                                templateName: template.name,
                                repoName: data.siteSlug,
                                githubRepoUrl: data.repoUrl,
                            }),
                        });
                        const checkData = await checkRes.json();

                        if (checkData.readyState === 'READY') {
                            clearInterval(pollInterval);
                            setDeployedUrl(checkData.url);
                            setPhase('success');
                        } else if (checkData.readyState === 'ERROR' || checkData.readyState === 'CANCELED') {
                            clearInterval(pollInterval);
                            const code = checkData.refCode || 'ERR-BUILD';
                            setErrorRefCode(code);
                            setStatusMsg('Ocorreu um erro na compilação do seu site. Nossa equipe já foi notificada.');
                            setPhase('error');
                        } else {
                            const stateMap: Record<string, string> = {
                                'BUILDING': 'Compilando o código…',
                                'QUEUED': 'Na fila de deploy…',
                                'INITIALIZING': 'Inicializando o projeto…',
                                'ANALYZING': 'Analisando arquivos…',
                            };
                            setStatusMsg(stateMap[checkData.readyState] || 'Construindo o site…');
                        }
                    } catch {
                        // Falha de rede no polling, ignora e tenta de novo
                    }
                }, 4000);
            } else {
                setStatusMsg('Deploy iniciado. Verifique em "Meus Sites" daqui a alguns minutos.');
                setPhase('success');
            }
        } catch (err: unknown) {
            setStatusMsg(err instanceof Error ? err.message : 'Erro no deploy.');
            setPhase('error');
        }
    }

    // ── Loading / not found ──
    if (templateLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-3">
                <Loader2 className="w-7 h-7 animate-spin text-coral-terra" />
                <p className="text-cafe-medio text-sm">Carregando template…</p>
            </div>
        );
    }

    if (loadError || !template) {
        return (
            <div className="max-w-2xl mx-auto pt-8 space-y-4">
                <Banner tone="error" title="Template não disponível">
                    {loadError ?? 'Esse template não existe ou foi removido.'}
                </Banner>
                <a
                    href="/sites"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-coral-terra hover:text-terracota-profundo transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Voltar pra vitrine
                </a>
            </div>
        );
    }

    const cleanRepoName = (v: string) =>
        v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

    const canSubmit = repoName.length >= 3 && adminPassword.length >= 4 && hasTokens && phase === 'idle';

    return (
        <div className="space-y-6 pb-8 max-w-3xl mx-auto">
            {/* Breadcrumb */}
            <a
                href="/sites"
                className="inline-flex items-center gap-2 text-sm font-semibold text-cafe-medio hover:text-coral-terra transition-colors group"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                Voltar pra vitrine
            </a>

            {/* Header com preview + nome */}
            <div className="flex flex-col sm:flex-row gap-5 items-start border-b border-borda-cafe pb-5">
                {template.image_url && (
                    <div className="w-full sm:w-48 aspect-video bg-cream-elevated rounded-[12px] overflow-hidden shrink-0">
                        <img src={template.image_url} alt={template.name} className="w-full h-full object-cover" />
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-coral-terra uppercase tracking-[0.12em]">
                        Publicar template
                    </p>
                    <h1 className="font-display text-3xl md:text-[2rem] font-normal text-carvao-quente tracking-tight mt-1">
                        {template.name}
                    </h1>
                    {template.description && (
                        <p className="text-base text-cafe-medio mt-2 leading-relaxed line-clamp-2">
                            {template.description}
                        </p>
                    )}
                </div>
            </div>

            {/* ── SUCCESS ───────────────────────────────────────── */}
            {phase === 'success' && deployedUrl && (
                <Card padding="lg" className="!border-verde-oliva/40">
                    <div className="flex flex-col items-center text-center gap-4 py-4">
                        <div className="w-16 h-16 rounded-full bg-verde-oliva flex items-center justify-center">
                            <CheckCircle2 className="w-8 h-8 text-papel-craft" strokeWidth={2.5} />
                        </div>
                        <div className="space-y-1">
                            <h2 className="font-display text-2xl font-normal text-carvao-quente tracking-tight">
                                Seu site tá no ar.
                            </h2>
                            <p className="text-sm text-cafe-medio">
                                Tudo certo. Você pode acessar agora e começar a editar o conteúdo.
                            </p>
                        </div>
                        <p className="font-mono text-sm text-cafe-medio bg-cream-elevated px-3 py-1.5 rounded-[8px] border border-borda-cafe">
                            {deployedUrl.replace(/^https?:\/\//, '')}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto pt-2">
                            <a
                                href={`https://${deployedUrl.replace(/^https?:\/\//, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 bg-cream-elevated hover:bg-coral-wash text-carvao-quente hover:text-terracota-profundo border border-borda-cafe px-5 py-3 rounded-[12px] font-semibold text-sm transition-colors active:scale-[0.98] min-h-[44px]"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Ver site
                            </a>
                            <a
                                href={`https://${deployedUrl.replace(/^https?:\/\//, '')}/admin`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-5 py-3 rounded-[12px] font-semibold text-sm transition-colors active:scale-[0.98] min-h-[44px]"
                            >
                                <LayoutDashboard className="w-4 h-4" />
                                Editar conteúdo
                            </a>
                            <a
                                href="/meus-sites"
                                className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-cafe-medio hover:text-coral-terra transition-colors min-h-[44px] px-3"
                            >
                                Ver minha carteira →
                            </a>
                        </div>
                    </div>
                </Card>
            )}

            {/* ── ERROR ─────────────────────────────────────────── */}
            {phase === 'error' && (
                <Banner
                    tone="error"
                    title="Algo deu errado no deploy"
                    action={
                        <a
                            href="/suporte"
                            className="inline-flex items-center gap-1 text-sm font-semibold text-coral-terra hover:text-terracota-profundo transition-colors whitespace-nowrap"
                        >
                            Falar com suporte <ArrowRight className="w-3.5 h-3.5" />
                        </a>
                    }
                >
                    {statusMsg}
                    {errorRefCode && (
                        <span className="block mt-1.5 font-mono text-xs">
                            Código: <strong>{errorRefCode}</strong> — passe pro suporte se precisar.
                        </span>
                    )}
                </Banner>
            )}

            {/* ── DEPLOYING ─────────────────────────────────────── */}
            {phase === 'deploying' && (
                <Card padding="lg">
                    <div className="flex items-center gap-4">
                        <Loader2 className="w-6 h-6 animate-spin text-coral-terra shrink-0" />
                        <div className="min-w-0 flex-1">
                            <p className="font-display text-lg font-normal text-carvao-quente tracking-tight">
                                {statusMsg}
                            </p>
                            <p className="text-sm text-cafe-medio mt-0.5">
                                Pode levar até 3 minutos. Não feche essa página.
                            </p>
                        </div>
                    </div>
                </Card>
            )}

            {/* ── IDLE: FORM ─────────────────────────────────────── */}
            {phase === 'idle' && hasTokens === false && (
                <Banner
                    tone="warning"
                    title="Você precisa conectar suas contas antes"
                    action={
                        <a
                            href="/configuracoes?tab=integracao"
                            className="inline-flex items-center gap-1 text-sm font-semibold text-coral-terra hover:text-terracota-profundo transition-colors whitespace-nowrap"
                        >
                            Conectar agora <ArrowRight className="w-3.5 h-3.5" />
                        </a>
                    }
                >
                    Pra publicar esse template, conecte GitHub (criar repositório) e Vercel (publicar). São 2 conexões grátis, feito uma vez só.
                </Banner>
            )}

            {phase === 'idle' && hasTokens && (
                <form onSubmit={handleDeploy} className="space-y-5">
                    <Card padding="lg" className="space-y-5">
                        <div className="flex items-start gap-3 pb-3 border-b border-borda-cafe">
                            <div className="w-10 h-10 rounded-full bg-coral-wash flex items-center justify-center shrink-0">
                                <Rocket className="w-5 h-5 text-coral-terra" />
                            </div>
                            <div>
                                <h2 className="font-display text-lg font-normal text-carvao-quente tracking-tight">
                                    Dá um nome e publica
                                </h2>
                                <p className="text-sm text-cafe-medio mt-0.5">
                                    Em ~2 minutos seu site tá no ar com endereço próprio.
                                </p>
                            </div>
                        </div>

                        <Field
                            label="Nome do site"
                            htmlFor="repo-name"
                            helper={
                                repoName
                                    ? `Endereço: ${cleanRepoName(repoName)}.vercel.app`
                                    : 'Use letras minúsculas, números e traços. Vai virar o endereço do site.'
                            }
                        >
                            <Input
                                id="repo-name"
                                type="text"
                                value={repoName}
                                onChange={e => setRepoName(cleanRepoName(e.target.value))}
                                placeholder="meu-blog-2026"
                                minLength={3}
                                maxLength={50}
                                required
                                className="font-mono"
                            />
                        </Field>

                        <Field
                            label="Senha de admin"
                            htmlFor="admin-password"
                            helper="Vai ser usada pra entrar no painel de edição do site. Guarde com você."
                        >
                            <Input
                                id="admin-password"
                                type="password"
                                value={adminPassword}
                                onChange={e => setAdminPassword(e.target.value)}
                                placeholder="••••••"
                                minLength={4}
                                required
                            />
                        </Field>

                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="w-full inline-flex items-center justify-center gap-2 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-6 py-3.5 rounded-[12px] font-semibold text-base transition-colors active:scale-[0.98] min-h-[48px] disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra"
                        >
                            <Rocket className="w-4 h-4" />
                            Publicar agora
                            <ArrowRight className="w-4 h-4" />
                        </button>

                        <p className="text-xs text-cafe-cinza-quente text-center">
                            Ao publicar, criamos um repositório no seu GitHub e fazemos o deploy automático na Vercel.
                        </p>
                    </Card>
                </form>
            )}
        </div>
    );
}
