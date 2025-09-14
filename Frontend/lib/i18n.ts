export type Lang = 'ja' | 'en';

const LANG_KEY = 'uiLang';
const LANG_EVENT = 'ui-lang-change';

export function getLang(): Lang {
  try {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(LANG_KEY) as Lang | null;
      if (saved === 'ja' || saved === 'en') return saved;
    }
  } catch {}
  if (typeof navigator !== 'undefined') {
    const l = (navigator.language || (navigator.languages && navigator.languages[0]) || '').toLowerCase();
    if (l.startsWith('en')) return 'en';
  }
  return 'ja';
}

export function setLang(lang: Lang) {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANG_KEY, lang);
      window.dispatchEvent(new CustomEvent(LANG_EVENT, { detail: { lang } }));
    }
  } catch {}
}

const dict = {
  ja: {
    back_to_search: '検索画面に戻る',
    go_home: 'ホームへ',
    schedule_title: '診療スケジュール',
    year_month: (y: number, m: number) => `${y}年 ${m}月`,
    app_title: 'AI Vet Chart',
    app_tagline: '大動物臨床向けAIカルテシステム (MVP)',
    search_placeholder: 'チップ番号、患畜名、牧場名…',
    search_button: '検索',
    schedule_button: 'スケジュール',
    browse_farms_button: '牧場一覧から探す',
    new_animal_button: '新規登録はこちら',
    sample_terms_lead: '検索例:',
    sample_term1: 'はな',
    sample_farm1: '佐藤牧場',
    farms_heading: '牧場一覧（五十音順）',
    search_again: '再検索する',
    results_count: (n: number) => `検索結果: ${n} 件`,
    no_results: (q: string) => `「${q}」に一致する動物は見つかりませんでした。`,
    add_new: '新規登録する',
  },
  en: {
    back_to_search: 'Back to search',
    go_home: 'Home',
    schedule_title: 'Schedule',
    year_month: (y: number, m: number) => `${m}/${y}`,
    app_title: 'AI Vet Chart',
    app_tagline: 'AI charting system for large-animal practice (MVP)',
    search_placeholder: 'Microchip number, animal name, or farm…',
    search_button: 'Search',
    schedule_button: 'View schedule',
    browse_farms_button: 'Browse farms',
    new_animal_button: 'Add a new animal',
    sample_terms_lead: 'Examples:',
    sample_term1: 'Hana',
    sample_farm1: 'Sato Farm',
    farms_heading: 'Farms (A–Z)',
    search_again: 'Back to search',
    results_count: (n: number) => `Results: ${n}`,
    no_results: (q: string) => `No animals found for “${q}”.`,
    add_new: 'Add a new animal',
  },
} as const;

export function t(key: keyof typeof dict['ja']): string {
  const lang = getLang();
  const v = (dict as any)[lang][key];
  return typeof v === 'function' ? '' : v ?? key;
}

export function formatYearMonthFor(lang: Lang, y: number, m: number): string {
  const f = (dict as any)[lang].year_month;
  return typeof f === 'function' ? f(y, m) : `${y}-${m}`;
}

export function formatYearMonth(y: number, m: number): string {
  return formatYearMonthFor(getLang(), y, m);
}

export function WEEKDAYS_I18N(lang: Lang): string[] {
  return lang === 'en' ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['日', '月', '火', '水', '木', '金', '土'];
}

export function WEEKDAYS_FULL_I18N(lang: Lang): string[] {
  return lang === 'en'
    ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    : ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
}

// Simple i18n hook for reactive updates
import { useEffect, useState } from 'react';
export function useI18n() {
  const [lang, setLangState] = useState<Lang>(getLang());
  useEffect(() => {
    const handler = (e: any) => {
      setLangState((e?.detail?.lang as Lang) || getLang());
    };
    if (typeof window !== 'undefined') {
      window.addEventListener(LANG_EVENT, handler);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(LANG_EVENT, handler);
      }
    };
  }, []);
  return {
    lang,
    setLang,
    t: (key: keyof typeof dict['ja']) => {
      const v = (dict as any)[lang][key];
      return typeof v === 'function' ? '' : v ?? (key as string);
    },
    formatYearMonth: (y: number, m: number) => formatYearMonthFor(lang, y, m),
    WEEKDAYS: WEEKDAYS_I18N(lang),
    WEEKDAYS_FULL: WEEKDAYS_FULL_I18N(lang),
  } as const;
}
