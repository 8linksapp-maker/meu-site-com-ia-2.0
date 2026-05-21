import Stripe from 'stripe';

const secretKey =
  import.meta.env.STRIPE_SECRET_KEY ||
  process.env.STRIPE_SECRET_KEY ||
  '';

if (!secretKey) {
  console.warn('[stripe] STRIPE_SECRET_KEY ausente — confere .env do worktree e reinicia o dev');
}

export const stripe = new Stripe(secretKey);

export const STRIPE_WEBHOOK_SECRET: string =
  import.meta.env.STRIPE_WEBHOOK_SECRET ||
  process.env.STRIPE_WEBHOOK_SECRET ||
  '';
