import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from './i18n';
import type { Language, Preferences } from '../../shared/models/preferences';
import { HomeScreen } from './features/home/home-screen';
import { LanguageChooser } from './features/settings/language-menu';
import { SplashScreen } from './features/splash/splash-screen';
import { splashStart } from './features/splash/splash-effect';

export function App() {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState<Preferences>();
  const [start, setStart] = useState<number>();
  const [progress, setProgress] = useState(0);
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    void (async () => {
      const loaded = await window.vfxlab.getPreferences();
      await i18n.changeLanguage(loaded.language);
      const reduced =
        loaded.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
      setPrefs(loaded);
      setStart(splashStart({ hasSeenSplash: loaded.hasSeenSplash, reducedMotion: reduced }));
      setProgress(0.5);
      await Promise.all([
        document.fonts.load('600 40px "Pixelify Sans"'),
        document.fonts.load('400 20px "Noto Sans Thai"', 'ก'),
      ]);
      setProgress(1);
    })();
  }, []);

  const finishSplash = useCallback(() => {
    setSplashDone(true);
    void window.vfxlab.markSplashSeen();
  }, []);

  const chooseLanguage = useCallback(async (language: Language) => {
    await i18n.changeLanguage(language);
    setPrefs(await window.vfxlab.setLanguage(language));
  }, []);

  if (!prefs || start === undefined) return null;
  if (!splashDone) {
    return (
      <SplashScreen
        start={start}
        ready={progress === 1}
        progress={progress}
        status={t(
          progress < 0.5 ? 'splash.engine' : progress < 1 ? 'splash.library' : 'splash.ready',
        )}
        onDone={finishSplash}
      />
    );
  }
  if (!prefs.hasChosenLanguage) return <LanguageChooser onChange={chooseLanguage} />;
  return <HomeScreen language={prefs.language} onLanguage={chooseLanguage} />;
}
