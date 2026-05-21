import Stripe from 'stripe';

const secretKey = import.meta.env.STRIPE_SECRET_KEY || '';
if (!secretKey) console.warn('[stripe] STRIPE_SECRET_KEY ausente');

export const stripe = new Stripe(secretKey);

export const STRIPE_WEBHOOK_SECRET: string = import.meta.env.STRIPE_WEBHOOK_SECRET || '';
