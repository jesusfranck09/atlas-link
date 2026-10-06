import { useId } from 'react';
import styles from './landing-donut.module.css';

export type LandingDonutSegment = { label: string; value: number };
export type LandingDonutProps = {
  segments: LandingDonutSegment[];
  totalLabel: string;
  totalValue: string;
  className?: string;
};

const percent = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });
const count = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });
const safeValue = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;
const segmentStyles = [styles.segmentPrimary, styles.segmentSecondary, styles.segmentNeutral];

/** Lightweight, data-transparent chart for the public product preview. */
export function LandingDonut({ segments, totalLabel, totalValue, className }: LandingDonutProps) {
  const titleId = useId();
  const descriptionId = useId();
  const data = segments.map(segment => ({ ...segment, value: safeValue(segment.value) }));
  const total = data.reduce((sum, segment) => sum + segment.value, 0);
  const radius = 64;
  const circumference = Math.PI * radius * 2;
  const offsets = data.map((_, index) => data
    .slice(0, index)
    .reduce((sum, segment) => sum + segment.value, 0));

  const slices = data.map((segment, index) => {
    const length = total ? segment.value / total * circumference : 0;
    const offset = total ? offsets[index] / total * circumference : 0;
    const gap = data.filter(item => item.value > 0).length > 1 ? 3 : 0;
    return {
      ...segment,
      offset,
      length: Math.max(0, length - gap),
      className: segmentStyles[index % segmentStyles.length],
    };
  });

  const description = data.map(segment => `${segment.label}: ${count.format(segment.value)}`).join('; ');

  return <figure data-landing-donut className={`${styles.figure}${className ? ` ${className}` : ''}`}>
    <div className={styles.heading}>
      <span>{totalLabel}</span>
      <strong>{totalValue}</strong>
    </div>
    <svg className={styles.chart} viewBox="0 0 160 160" role="img" aria-labelledby={`${titleId} ${descriptionId}`}>
      <title id={titleId}>Distribución ilustrativa de cuentas</title>
      <desc id={descriptionId}>{description}</desc>
      <circle className={styles.track} cx="80" cy="80" r={radius} />
      <g transform="rotate(-90 80 80)">
        {slices.map((segment, index) => segment.length > 0 && <circle
          key={`${segment.label}-${index}`}
          className={`${styles.segment} ${segment.className}`}
          cx="80"
          cy="80"
          r={radius}
          strokeDasharray={`${segment.length} ${circumference}`}
          strokeDashoffset={-segment.offset}
        />)}
      </g>
    </svg>
    <ul className={styles.legend}>
      {data.map((segment, index) => <li className={styles.legendItem} key={`${segment.label}-${index}`}>
        <span className={`${styles.legendMark} ${segmentStyles[index % segmentStyles.length]}`} aria-hidden="true" />
        <span className={styles.legendLabel}>{segment.label}</span>
        <strong>{count.format(segment.value)}</strong>
        <span className={styles.legendPercent}>{total ? `${percent.format(segment.value / total * 100)} %` : '0 %'}</span>
      </li>)}
    </ul>
    <figcaption className={styles.caption}>Datos sintéticos de demostración.</figcaption>
  </figure>;
}
