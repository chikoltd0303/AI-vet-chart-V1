import { api } from './realApi';
import { getLang } from './i18n';

// Simple cache to avoid repeated translations during a session
const cache = new Map<string, string>();

function targetLang(): 'ja' | 'en' {
  try {
    const l = getLang();
    return l === 'en' ? 'en' : 'ja';
  } catch { return 'ja'; }
}

function seemsJapanese(text: string): boolean {
  // naive: contains Hiragana/Katakana/Kanji
  return /[\u3040-\u30ff\u3400-\u9faf]/.test(text);
}

export async function maybeTranslate(text: string): Promise<string> {
  try {
    if (!text) return text;
    const tgt = targetLang();
    // heuristics: if target is en and text looks Japanese → translate to en
    // if target is ja and text looks non-Japanese (ASCII heavy) → translate to ja
    const looksJa = seemsJapanese(text);
    const shouldTranslate = (tgt === 'en' && looksJa) || (tgt === 'ja' && !looksJa);
    if (!shouldTranslate) return text;
    const key = `${tgt}::${text}`;
    const hit = cache.get(key);
    if (hit) return hit;
    const res = await api.translateText(text, tgt);
    const out = (res?.translated || '').trim() || text;
    cache.set(key, out);
    return out;
  } catch {
    return text;
  }
}
