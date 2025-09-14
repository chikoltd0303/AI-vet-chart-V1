"use client";
import React from 'react';
import { maybeTranslate } from '@/lib/translate';

type Props = {
  text?: string | null;
  className?: string;
};

export default function Translatable({ text, className }: Props) {
  const [value, setValue] = React.useState<string>(text || '');
  const src = text || '';
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const out = await maybeTranslate(src);
      if (!cancelled) setValue(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [src]);
  return <span className={className}>{value}</span>;
}

