import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const files = import.meta.glob<Record<string, unknown>>('../locales/*/*.json', {
  eager: true,
  import: 'default',
});

const resources: Record<string, Record<string, Record<string, unknown>>> = {};
for (const [path, data] of Object.entries(files)) {
  const [, lng, ns] = path.match(/locales\/(\w+)\/(\w+)\.json$/)!;
  (resources[lng!] ??= {})[ns!] = data;
}

void i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

export default i18n;
