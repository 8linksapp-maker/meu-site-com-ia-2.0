/**
 * Seed do piloto cloud: lê os defaults do template clickbanker e popula um site_id de teste.
 * Esse é o conteúdo demo com que todo site novo daquele template nasce.
 *
 * Uso:
 *   PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   SEED_OWNER_ID=<uuid auth.users> \
 *   bun run scripts/seed-cloud-site.ts
 *
 * NÃO rodar contra Supabase de produção — banco compartilhado com os 100 antigos.
 * Só usar num projeto Supabase de teste (decisão de aplicar é do Bruno/Tião).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { SupabaseCmsDriver } from '../src/lib/cms/driver-supabase';
import type { SitePostInput } from '../src/lib/cms/types';

const TEMPLATE_DIR = 'C:/Projects/templates/clickbanker';
const DATA_DIR = resolve(TEMPLATE_DIR, 'src/data');
const BLOG_DIR = resolve(TEMPLATE_DIR, 'src/content/blog');

const CONTENT_KEYS = [
  ['siteConfig', 'siteConfig.json'],
  ['home', 'home.json'],
  ['sobre', 'sobre.json'],
  ['contato', 'contato.json'],
  ['menu', 'menu.json'],
  ['categories', 'categories.json'],
  ['authors', 'authors.json'],
] as const;

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(resolve(DATA_DIR, file), 'utf-8'));
}

// Parser mínimo de frontmatter YAML (escopo piloto: só escalares + corpo).
// Arrays do frontmatter (comparedProductSlugs etc.) são de plugins fora do piloto — ignorados.
function parseFrontmatter(raw: string): { fm: Record<string, string>; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { fm: {}, body: raw };
  const fm: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
    if (!kv) continue;
    let val = kv[2].trim();
    if (val === '' || val === '|' || val === '>') continue; // pula chaves de bloco/array
    val = val.replace(/^["']|["']$/g, '');
    fm[kv[1]] = val;
  }
  return { fm, body: m[2].trim() };
}

function loadPosts(): SitePostInput[] {
  const files = readdirSync(BLOG_DIR).filter((f) => f.endsWith('.md'));
  const posts: SitePostInput[] = [];
  for (const file of files) {
    const raw = readFileSync(resolve(BLOG_DIR, file), 'utf-8');
    const { fm, body } = parseFrontmatter(raw);
    const slug = file.replace(/\.md$/, '');
    const pub = fm.pubDate ? new Date(fm.pubDate) : null;
    posts.push({
      slug,
      title: fm.title ?? slug,
      description: fm.description ?? null,
      body_md: body,
      category: fm.category ?? null,
      author: fm.author ?? null,
      hero_image_path: fm.heroImage || null,
      is_published: fm.draft !== 'true',
      published_at: pub && !Number.isNaN(pub.getTime()) ? pub : null,
    });
  }
  return posts;
}

async function main() {
  const owner = process.env.SEED_OWNER_ID;
  if (!owner) {
    throw new Error('SEED_OWNER_ID (uuid de auth.users) é obrigatório pra amarrar sites.owner');
  }
  const subdomain = process.env.SEED_SUBDOMAIN ?? 'clickbanker-demo';

  const cms = new SupabaseCmsDriver();

  console.log(`[seed] upsert site owner=${owner} subdomain=${subdomain}`);
  const site = await cms.upsertSite({ owner, template: 'clickbanker', subdomain });
  console.log(`[seed] site_id = ${site.id}`);

  for (const [key, file] of CONTENT_KEYS) {
    await cms.saveContent(site.id, key, readJson(file));
    console.log(`[seed] content '${key}' ok`);
  }

  const posts = loadPosts();
  await cms.savePosts(site.id, posts);
  console.log(`[seed] ${posts.length} posts carregados`);

  console.log('[seed] concluído. site_id de teste:', site.id);
}

main().catch((e) => {
  console.error('[seed] falhou:', e.message);
  process.exit(1);
});
