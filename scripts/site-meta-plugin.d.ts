import type { Plugin } from 'vite';

export const LOCAL_URL: string;
export function siteUrl(env?: Record<string, string | undefined>): string;
export function sitePaths(): string[];
export function robotsTxt(url: string): string;
export function sitemapXml(url: string, paths?: string[]): string;
export default function siteMeta(): Plugin;
