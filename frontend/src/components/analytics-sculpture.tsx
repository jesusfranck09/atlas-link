'use client';

import { useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { comparisonPalette } from '@/lib/chart-palette';
import s from './analytics-sculpture.module.css';

export type SculptureValue = { label: string; value: number; color: string };
export type AnalyticsSculptureProps = {
  values: SculptureValue[];
  variant?: 'ring' | 'pie' | 'bars';
  compact?: boolean;
  density?: 'regular' | 'compact';
  minimal?: boolean;
  caption?: string;
};

const number = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 6 });
const percentage = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 });
const shortNumber = new Intl.NumberFormat('es-MX', { notation: 'compact', maximumFractionDigits: 1 });
const positive = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;
const printable = (value: number) => Number.isFinite(value) ? number.format(value) : '—';
const colorFor = (color: string, index: number) => /^#[0-9a-f]{6}$/i.test(color) ? color : comparisonPalette[index % comparisonPalette.length];
const pieDepth = 20;

function polar(cx: number, cy: number, radius: number, angle: number) {
  return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius] as const;
}

function sectorPath(start: number, end: number, radius: number) {
  const [sx, sy] = polar(0, 0, radius, start);
  const [ex, ey] = polar(0, 0, radius, end);
  const large = end - start > Math.PI ? 1 : 0;
  return `M0 0 L${sx} ${sy} A${radius} ${radius} 0 ${large} 1 ${ex} ${ey} Z`;
}

function shade(color: string, factor: number) {
  const channels = color.match(/[0-9a-f]{2}/gi)?.map(channel => Number.parseInt(channel, 16)) || [121, 105, 167];
  return `#${channels.map(channel => Math.round(channel * factor).toString(16).padStart(2, '0')).join('')}`;
}

function pieArcWallPath(start: number, end: number, radius: number, depth: number) {
  const frontStart = Math.max(start, 0);
  const frontEnd = Math.min(end, Math.PI);
  if (frontEnd - frontStart < 1e-6) return null;

  const [sx, sy] = polar(0, 0, radius, frontStart);
  const [ex, ey] = polar(0, 0, radius, frontEnd);
  const large = frontEnd - frontStart > Math.PI ? 1 : 0;
  return `M${sx} ${sy} A${radius} ${radius} 0 ${large} 1 ${ex} ${ey} L${ex} ${ey + depth} A${radius} ${radius} 0 ${large} 0 ${sx} ${sy + depth} Z`;
}

function pieRadialWallPath(angle: number, radius: number, depth: number) {
  if (Math.sin(angle) < -1e-6) return null;
  const [x, y] = polar(0, 0, radius, angle);
  return `M0 0 L${x} ${y} L${x} ${y + depth} L0 ${depth} Z`;
}

function ChartSvg({ values, variant, selected, total }: { values: SculptureValue[]; variant: NonNullable<AnalyticsSculptureProps['variant']>; selected: number; total: number }) {
  const slices = values.reduce<{ cursor: number; items: Array<{ item: SculptureValue; index: number; fraction: number; start: number }> }>((acc, item, index) => {
    const fraction = total ? positive(item.value) / total : 0;
    return { cursor: acc.cursor + fraction, items: [...acc.items, { item, index, fraction, start: acc.cursor }] };
  }, { cursor: 0, items: [] }).items;

  if (variant === 'bars') {
    const max = Math.max(...values.map(item => positive(item.value)), 0) || 1;
    const top = 18;
    const baseline = 190;
    const chartHeight = baseline - top;
    const left = 52;
    const right = 536;
    const step = (right - left) / Math.max(values.length, 1);
    const width = Math.min(40, step * .48);
    const ticks = [0, .25, .5, .75, 1];
    return <svg className={s.chartSvg} viewBox="0 0 560 220" aria-hidden="true">
      {ticks.map((fraction, index) => {
        const y = baseline - chartHeight * fraction;
        return <g key={index}>
          <line x1={left} x2={right} y1={y} y2={y} className={s.gridLine}/>
          <text x="43" y={y + 4} textAnchor="end" className={s.axisLabel}>{shortNumber.format(max * fraction)}</text>
        </g>;
      })}
      {values.map((item, index) => {
        const value = positive(item.value);
        const height = value / max * chartHeight;
        const x = left + step * index + (step - width) / 2;
        const y = baseline - height;
        return <g key={`${index}-${item.label}`}>
          {index === selected && <rect x={x - 5} y={top - 6} width={width + 10} height={chartHeight + 12} rx="12" className={s.selectedColumn}/>}
          <rect x={x} y={y} width={width} height={Math.max(0, height)} rx={Math.min(9, width / 3)} fill={colorFor(item.color, index)} className={s.bar}/>
        </g>;
      })}
    </svg>;
  }

  if (variant === 'ring') {
    const radius = 73;
    const circumference = Math.PI * 2 * radius;
    return <svg className={s.chartSvg} viewBox="0 0 240 200" aria-hidden="true">
      <circle cx="120" cy="98" r={radius} className={s.ringTrack}/>
      {slices.map(({ item, index, fraction, start }) => {
        if (!fraction) return null;
        const segment = Math.max(0, fraction * circumference - Math.min(5, fraction * circumference * .12));
        return <circle key={`${index}-${item.label}`} cx="120" cy="98" r={radius} fill="none" stroke={colorFor(item.color, index)} strokeWidth={index === selected ? 24 : 20} strokeDasharray={`${segment} ${circumference}`} strokeDashoffset={-start * circumference} transform="rotate(-90 120 98)" className={s.ringSegment}/>;
      })}
    </svg>;
  }

  return <svg className={s.chartSvg} viewBox="0 0 240 200" aria-hidden="true">
    {!total && <circle cx="120" cy="98" r="77" className={s.emptyCircle}/>}
    <g transform="translate(120 98)">
      <g aria-hidden="true">
        {slices.map(({ item, index, fraction, start }) => {
          if (!fraction) return null;
          const angleStart = -Math.PI / 2 + start * Math.PI * 2;
          const angleEnd = angleStart + fraction * Math.PI * 2;
          const color = colorFor(item.color, index);
          const arcWall = pieArcWallPath(angleStart, angleEnd, 77, pieDepth);
          const startWall = pieRadialWallPath(angleStart, 77, pieDepth);
          const endWall = pieRadialWallPath(angleEnd, 77, pieDepth);
          return <g key={`${index}-${item.label}`}>
            {arcWall && <path d={arcWall} fill={shade(color, .78)} className={s.pieSideWall}/>}
            {startWall && <path d={startWall} fill={shade(color, .68)} className={s.pieSideWall}/>}
            {endWall && <path d={endWall} fill={shade(color, .68)} className={s.pieSideWall}/>}
          </g>;
        })}
      </g>
      {slices.map(({ item, index, fraction, start }) => {
        if (!fraction) return null;
        const angleStart = -Math.PI / 2 + start * Math.PI * 2;
        const angleEnd = angleStart + fraction * Math.PI * 2;
        const color = colorFor(item.color, index);
        const selectedStroke = index === selected ? 'var(--color-focus)' : 'var(--color-surface)';
        return fraction >= 1 - 1e-9
          ? <circle key={`${index}-${item.label}`} cx="0" cy="0" r="77" fill={color} stroke={selectedStroke} strokeWidth="2" strokeLinejoin="round" className={s.pieSegment}/>
          : <path key={`${index}-${item.label}`} d={sectorPath(angleStart, angleEnd, 77)} fill={color} stroke={selectedStroke} strokeWidth="2" strokeLinejoin="round" className={s.pieSegment}/>;
      })}
    </g>
  </svg>;
}

/** Accessible SVG charts keep operational visualizations light and consistent. */
export function AnalyticsSculpture({ values, variant = 'ring', compact = false, density = 'regular', minimal = false, caption }: AnalyticsSculptureProps) {
  const id = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const [selected, setSelected] = useState(0);
  const active = Math.min(selected, Math.max(0, values.length - 1));
  const item = values[active];
  const total = values.reduce((sum, value) => sum + positive(value.value), 0);
  const hasNegatives = values.some(value => value.value < 0);

  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % values.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + values.length) % values.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = values.length - 1;
    else return;
    event.preventDefault();
    setSelected(next);
    buttons.current[next]?.focus();
  }

  return <figure className={`${s.sculpture} ${compact ? s.compact : ''} ${minimal ? s.minimal : ''}`} data-analytics-sculpture={variant} data-density={density} aria-labelledby={`${id}-title`}>
    <span id={`${id}-title`} className={s.srOnly}>{caption || 'Distribución de valores'}</span>
    {variant === 'pie' && !minimal && <div className={s.pieSummary}><div><strong title={printable(total)}>{total >= 10000 ? shortNumber.format(total) : printable(total)}</strong><span>Total representado</span></div><span>Distribución</span></div>}
    <div className={s.stage}>
      <ChartSvg values={values} variant={variant} selected={active} total={total}/>
      {variant === 'ring' && <div className={s.center} aria-hidden="true"><span>Total</span><strong title={printable(total)}>{total >= 10000 ? shortNumber.format(total) : printable(total)}</strong></div>}
    </div>
    <div className={minimal ? s.srOnly : s.selection} aria-live="polite" aria-atomic="true">
      {item ? <><span className={s.selectedDot} style={{ background: colorFor(item.color, active) }}/><span className={s.selectedLabel}>{item.label}</span><strong>{printable(item.value)}</strong>{total > 0 && <span className={s.percentage}>{percentage.format(positive(item.value) / total * 100)}<small>%</small></span>}</> : <span>Sin datos disponibles</span>}
    </div>
    <div className={s.legend} role="group" aria-label="Explorar categorías del gráfico">
      {values.map((value, index) => {
        const share = total > 0 ? `${percentage.format(positive(value.value) / total * 100)}%` : '—';
        return <button type="button" key={`${index}-${value.label}`} ref={element => { buttons.current[index] = element; }} className={s.legendItem} aria-pressed={index === active} aria-label={variant === 'pie' ? `${value.label}: ${printable(value.value)}, ${share}` : undefined} onClick={() => setSelected(index)} onKeyDown={event => navigate(event, index)} style={{ '--sculpture-color': colorFor(value.color, index) } as CSSProperties}>
          <span className={s.legendDot}/><span className={s.legendLabel}>{value.label}</span>
          {variant === 'pie' ? <span className={s.pieLegendMetrics}><strong>{printable(value.value)}</strong><span className={s.pieLegendShare}>{share}</span></span> : <strong>{printable(value.value)}</strong>}
        </button>;
      })}
    </div>
    {caption && <figcaption className={minimal ? s.srOnly : s.caption}>{caption}</figcaption>}
    {hasNegatives && <p className={s.caption}>El volumen representa los valores positivos. Los valores negativos se conservan en la leyenda.</p>}
  </figure>;
}
