/**
 * Pattern library Café-da-Tarde · MSIA 2026
 *
 * Primitives reutilizáveis pra todas as pages do dashboard. Consome tokens
 * do `global.css` (@theme) e respeita as regras documentadas em DESIGN.md.
 *
 * Uso:
 *   import { Button, Card, Section, EmptyState, Field, Input, Textarea, Tabs, Banner } from '@/components/ui';
 *
 * Quando criar componentes novos aqui, atualize este index.
 */

export { default as Button } from './Button';
export { default as Card } from './Card';
export { default as EmptyState } from './EmptyState';
export { default as Field } from './Field';
export { Input, Textarea } from './Input';
export { default as Section } from './Section';
export { default as Tabs } from './Tabs';
export type { TabItem } from './Tabs';
export { default as Banner } from './Banner';
