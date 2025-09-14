import { api } from './realApi';

// Simple cache to avoid repeated translations during a session
const cache = new Map<string, string>();

function prefersEnglish(): boolean {
  if (typeof navigator === 'undefined') return false;
  const l = (navigator.language || (navigator.languages && navigator.languages[0]) || '').toLowerCase();
  return l.startsWith('en');
}

function seemsJapanese(text: string): boolean {
  // naive: contains Hiragana/Katakana/Kanji
  return /[\u3040-\u30ff\u3400-\u9faf]/.test(text);
}

export async function maybeTranslate(text: string): Promise<string> {
  try {
    if (!text) return text;
    if (!prefersEnglish()) return text;
    if (!seemsJapanese(text)) return text;
    const key = `en::${text}`;
    const hit = cache.get(key);
    if (hit) return hit;
    const res = await api.translateText(text, 'en');
    const out = (res?.translated || '').trim() || text;
    cache.set(key, out);
    return out;
  } catch {
    return text;
  }
}

