import { createI18n } from 'vue-i18n';
import messages from '@intlify/unplugin-vue-i18n/messages';

export function getBrowserLocale(supported: string[]) {
  const lang = navigator.language.toLowerCase().split('-')[0];
  return lang && supported.includes(lang) ? lang : 'en';
}

const supportedLocales = ['en', 'ru'];
const urlLocale = urlParams.get('t');

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: urlLocale || getBrowserLocale(supportedLocales),
  fallbackLocale: 'en',
  messages,
});

export const locale = (i18n.global.locale ?? 'en') as unknown as string;
