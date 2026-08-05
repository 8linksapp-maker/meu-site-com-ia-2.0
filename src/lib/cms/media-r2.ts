import type { MediaDriver, MediaUpload } from './types';

/**
 * Driver de mídia R2 (Cloudflare). O banco guarda só o `path`; o objeto vive no bucket.
 *
 * Convenção de path: `sites/<siteId>/media/<timestamp>-<filename>`
 *
 * O bucket e as credenciais chegam do Tião (chunk cloud-03). Até lá, `createMediaDriver()`
 * devolve um driver "unconfigured" que lança erro claro em qualquer upload/delete — mas a
 * INTERFACE já está fechada, então o admin e o seed podem programar contra ela hoje.
 *
 * Envs esperadas quando o Tião plugar (S3-compatible API do R2):
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL
 */

export function mediaPath(siteId: string, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '-');
  return `sites/${siteId}/media/${Date.now()}-${safe}`;
}

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string;
}

function readR2Config(): R2Config | null {
  const env = (k: string) =>
    (import.meta.env?.[k] as string | undefined) ?? process.env[k] ?? '';
  const cfg: R2Config = {
    accountId: env('R2_ACCOUNT_ID'),
    accessKeyId: env('R2_ACCESS_KEY_ID'),
    secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
    bucket: env('R2_BUCKET'),
    publicBaseUrl: env('R2_PUBLIC_BASE_URL'),
  };
  const complete = Object.values(cfg).every(Boolean);
  return complete ? cfg : null;
}

/** Placeholder até o Tião entregar o bucket. Interface fechada, impl adiada. */
class UnconfiguredMediaDriver implements MediaDriver {
  async uploadMedia(_upload: MediaUpload): Promise<{ path: string }> {
    throw new Error(
      '[cms] R2 não configurado — aguardando bucket/credenciais do Tião (chunk cloud-03). ' +
        'Defina R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET / R2_PUBLIC_BASE_URL.',
    );
  }
  publicUrl(path: string): string {
    // Sem base pública ainda; devolve o path cru pra não quebrar render (imagem some, layout fica).
    return `/${path}`;
  }
  async deleteMedia(_path: string): Promise<void> {
    throw new Error('[cms] R2 não configurado — deleteMedia indisponível até chunk cloud-03.');
  }
}

/**
 * Driver R2 real via API S3-compatible. Esqueleto pronto pro Tião: quando o bucket existir,
 * o corpo de uploadMedia/deleteMedia é assinatura SigV4 + fetch PUT/DELETE — sem novas deps
 * (usar @aws-sdk/client-s3 é opção do Tião; a interface não muda de qualquer forma).
 */
class R2MediaDriver implements MediaDriver {
  constructor(private cfg: R2Config) {}

  async uploadMedia(upload: MediaUpload): Promise<{ path: string }> {
    const path = mediaPath(upload.siteId, upload.filename);
    // TODO(cloud-03/Tião): PUT SigV4 em
    //   https://<accountId>.r2.cloudflarestorage.com/<bucket>/<path>
    // com Content-Type = upload.contentType e body = upload.body.
    throw new Error(
      `[cms] R2MediaDriver.uploadMedia ainda não implementado (path calculado: ${path}). ` +
        'Corpo do PUT SigV4 é responsabilidade do chunk cloud-03.',
    );
  }

  publicUrl(path: string): string {
    return `${this.cfg.publicBaseUrl.replace(/\/$/, '')}/${path}`;
  }

  async deleteMedia(_path: string): Promise<void> {
    throw new Error('[cms] R2MediaDriver.deleteMedia ainda não implementado (chunk cloud-03).');
  }
}

export function createMediaDriver(): MediaDriver {
  const cfg = readR2Config();
  return cfg ? new R2MediaDriver(cfg) : new UnconfiguredMediaDriver();
}
