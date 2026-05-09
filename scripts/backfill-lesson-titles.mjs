#!/usr/bin/env node
// Backfill: regenera title/description/highlights das aulas com nome genérico
// usando o endpoint /api/admin/analyze-lesson (Gemini ou OpenAI conforme platform_settings.ai_provider).
//
// Salva em lessons.original_title o nome anterior pra rollback.
//
// Uso:
//   node scripts/backfill-lesson-titles.mjs --dry                    # só lista o que faria
//   node scripts/backfill-lesson-titles.mjs                          # roda nas aulas com "Encontro" no título
//   node scripts/backfill-lesson-titles.mjs --all                    # roda em TODAS as aulas com vídeo
//   node scripts/backfill-lesson-titles.mjs --id <lesson_id>         # 1 aula específica
//   node scripts/backfill-lesson-titles.mjs --base http://localhost:4321  # endpoint custom
//
// Pré-requisito:
//   1. ALTER TABLE lessons ADD COLUMN IF NOT EXISTS original_title TEXT;
//   2. ADMIN_TOKEN env var (Bearer access_token de um user com role=admin)
//      → pegue logando no /admin e copiando do localStorage / DevTools → Application → Local Storage

import process from 'node:process';

const SUPABASE_URL = 'https://bsebtmvautyhglmgmtaa.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzZWJ0bXZhdXR5aGdsbWdtdGFhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDM2MTU0OCwiZXhwIjoyMDg5OTM3NTQ4fQ.5gImU0QTP7DRuAVR0gr6j23Ri63e2kBpRIm1AGREeSU';

const args = process.argv.slice(2);
const opts = { dry: false, all: false, id: null, base: 'https://meusite-com-ia.vercel.app' };
for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--dry') opts.dry = true;
    else if (a === '--all') opts.all = true;
    else if (a === '--id') opts.id = args[++i];
    else if (a === '--base') opts.base = args[++i];
}

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
if (!opts.dry && !ADMIN_TOKEN) {
    console.error('ADMIN_TOKEN env var é obrigatório (sem --dry).');
    console.error('Pegue logando no /admin → DevTools → Application → Local Storage → sb-...-auth-token → access_token');
    process.exit(1);
}

const sup = (p) => fetch(`${SUPABASE_URL}${p}`, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }).then(r => r.json());

let q = '/rest/v1/lessons?select=id,title,description,video_url,original_title&video_url=not.is.null';
if (opts.id) q += `&id=eq.${opts.id}`;
else if (!opts.all) q += `&title=ilike.Encontro*`;

const lessons = await sup(q);
if (!Array.isArray(lessons)) {
    console.error('Erro buscando lessons:', lessons);
    process.exit(1);
}

console.log(`Encontradas ${lessons.length} aulas pra processar:\n`);
lessons.forEach(l => console.log(`  ${l.id.slice(0, 8)} | "${l.title}" | ${l.video_url?.slice(-60)}`));

if (opts.dry) {
    console.log('\n--dry: não vou processar. Remove --dry pra rodar de verdade.');
    process.exit(0);
}

console.log(`\nProcessando ${lessons.length} aulas via ${opts.base}/api/admin/analyze-lesson ...\n`);

let okCount = 0, failCount = 0;
for (const l of lessons) {
    process.stdout.write(`  ${l.id.slice(0, 8)} | "${l.title.slice(0, 40)}" ... `);
    try {
        const t0 = Date.now();
        const res = await fetch(`${opts.base}/api/admin/analyze-lesson`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${ADMIN_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoUrl: l.video_url }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

        // UPDATE no Supabase
        const update = {
            title: data.title,
            description: data.description,
            highlights: data.highlights?.length ? data.highlights : null,
        };
        if (!l.original_title) update.original_title = l.title;

        const upd = await fetch(`${SUPABASE_URL}/rest/v1/lessons?id=eq.${l.id}`, {
            method: 'PATCH',
            headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
            body: JSON.stringify(update),
        });
        if (!upd.ok) throw new Error(`UPDATE falhou: ${upd.status}`);

        const dur = Math.round((Date.now() - t0) / 1000);
        console.log(`✓ ${dur}s | "${data.title}"`);
        okCount++;
    } catch (e) {
        console.log(`✗ ${e.message}`);
        failCount++;
    }
}

console.log(`\nResumo: ${okCount} OK · ${failCount} falhou (de ${lessons.length})`);
if (failCount) process.exit(1);
