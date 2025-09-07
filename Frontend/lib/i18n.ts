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
  },
  en: {
    back_to_search: 'Back to Search',
    go_home: 'Home',
    schedule_title: 'Appointment Schedule',
    year_month: (y: number, m: number) => `${m}/${y}`,
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
