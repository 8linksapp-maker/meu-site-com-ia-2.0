import { Sparkles, ArrowLeft } from 'lucide-react';

interface Props {
  title?: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}

export default function ComingSoon({
  title = 'Marketplace em breve',
  description = 'Estamos preparando uma loja de templates premium pra você usar nos seus sites. Volte logo — vai valer a espera.',
  backHref = '/',
  backLabel = 'Voltar para o início',
}: Props) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#7c3aed]/10 flex items-center justify-center mx-auto mb-6">
          <Sparkles className="w-6 h-6 text-[#7c3aed]" />
        </div>

        <span className="inline-block text-[10px] font-black bg-[#7c3aed]/10 text-[#7c3aed] px-2.5 py-1 rounded-full uppercase tracking-wider mb-4">
          Em breve
        </span>

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 leading-tight">
          {title}
        </h1>

        <p className="text-sm text-gray-500 leading-relaxed mb-8">
          {description}
        </p>

        <a
          href={backHref}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#7c3aed] hover:text-[#6d28d9] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {backLabel}
        </a>
      </div>
    </div>
  );
}
