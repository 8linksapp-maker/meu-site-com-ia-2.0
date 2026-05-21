import { Resend } from 'resend';

const apiKey = import.meta.env.RESEND_API_KEY || '';
if (!apiKey) console.warn('[resend] RESEND_API_KEY ausente');

export const resend = new Resend(apiKey);
