import { useTranslation } from 'react-i18next';
import { MAX_NORMAL_STRENGTH } from '../../../../engine/normal-map';
import { Slider } from '../inspector/option-controls';

export function NormalControls(props: {
  enabled: boolean;
  strength: number;
  onToggle(): void;
  onStrength(value: number): void;
}) {
  const { t } = useTranslation('export');
  return (
    <>
      <button className="chip" type="button" aria-pressed={props.enabled} onClick={props.onToggle}>
        {t('normal')}
      </button>
      {props.enabled && (
        <Slider
          label={t('normalStrength')}
          value={props.strength}
          shown={props.strength.toFixed(1)}
          min={0}
          max={MAX_NORMAL_STRENGTH}
          step={0.1}
          onChange={props.onStrength}
        />
      )}
    </>
  );
}
