import { ASSET_CONFIG } from '../data/mapConfig';
import { getHostDocument } from '../host/hostDom';

function ensureTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}

function normalizeRelativePath(relativePath: string): string {
  return relativePath
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/{2,}/g, '/');
}

function getCurrentScriptBaseUrl(): string {
  const script = getHostDocument().currentScript as HTMLScriptElement | null;
  const src = script?.src;
  if (!src) {
    return '';
  }
  return src.slice(0, src.lastIndexOf('/') + 1);
}

export function resolveAssetUrl(relativePath: string): string {
  if (/^(https?:)?\/\//.test(relativePath) || relativePath.startsWith('data:') || relativePath.startsWith('blob:')) {
    return relativePath;
  }

  const normalizedPath = normalizeRelativePath(relativePath);
  const configuredBaseUrl = ASSET_CONFIG.assetBaseUrl.trim();
  if (configuredBaseUrl) {
    return new URL(normalizedPath, ensureTrailingSlash(configuredBaseUrl)).toString();
  }

  const scriptBaseUrl = getCurrentScriptBaseUrl();
  if (scriptBaseUrl) {
    return new URL(normalizedPath, scriptBaseUrl).toString();
  }

  return normalizedPath;
}
