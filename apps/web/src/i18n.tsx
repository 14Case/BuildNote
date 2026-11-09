import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { traduire, type Langue, type MessageKey, LANGUE_DEFAUT } from '@buildnote/shared/i18n';

interface I18nContextType {
  langue: Langue;
  setLangue: (l: Langue) => void;
  t: (cle: MessageKey, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [langue, setLangueState] = useState<Langue>(() => {
    const stockee = localStorage.getItem('buildnote_lang');
    return stockee === 'fr' || stockee === 'en' ? stockee : LANGUE_DEFAUT;
  });

  const setLangue = (l: Langue) => {
    setLangueState(l);
    localStorage.setItem('buildnote_lang', l);
  };

  useEffect(() => {
    document.documentElement.lang = langue;
  }, [langue]);

  const t = (cle: MessageKey, params?: Record<string, string | number>): string => {
    return traduire(langue, cle, params);
  };

  return (
    <I18nContext.Provider value={{ langue, setLangue, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export function useI18n(): I18nContextType {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return ctx;
}
