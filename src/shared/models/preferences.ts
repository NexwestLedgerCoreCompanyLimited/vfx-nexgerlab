import { z } from 'zod';

export const LanguageSchema = z.enum(['en', 'th']);
export type Language = z.infer<typeof LanguageSchema>;

export const PreferencesSchema = z.object({
  schemaVersion: z.literal(1),
  language: LanguageSchema,
  hasChosenLanguage: z.boolean(),
  reducedMotion: z.boolean(),
  uiScale: z.number().min(0.75).max(2),
  hasSeenSplash: z.boolean(),
});
export type Preferences = z.infer<typeof PreferencesSchema>;

export function defaultPreferences(systemLocale: string): Preferences {
  return {
    schemaVersion: 1,
    language: systemLocale.toLowerCase().startsWith('th') ? 'th' : 'en',
    hasChosenLanguage: false,
    reducedMotion: false,
    uiScale: 1,
    hasSeenSplash: false,
  };
}
