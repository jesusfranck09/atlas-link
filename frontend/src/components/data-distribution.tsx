'use client';

import { useState } from 'react';
import { number } from '@/lib/format';
import { AnalyticsSculpture, type SculptureValue } from './analytics-sculpture';
import { Button, Icon, Modal } from './ui';
import s from './data-distribution.module.css';

export function DataDistribution({
  title,
  scope,
  caption,
  values,
}: {
  title: string;
  scope: string;
  caption: string;
  values: SculptureValue[];
}) {
  const [open, setOpen] = useState(false);
  const total = values.reduce((sum, item) => sum + (Number.isFinite(item.value) ? Math.max(0, item.value) : 0), 0);
  const visible = values.filter(item => Number.isFinite(item.value) && item.value > 0);

  return <div className={s.analysisAccess}>
    <span className={s.analysisName}>{title}</span>
    <span className={s.analysisScope}>{number(total)} registros</span>
    {visible.length ? <Button type="button" variant="secondary" className={s.analysisButton} onClick={() => setOpen(true)}>
      <Icon name="chart" size={15}/><span>Gráfica 3D</span>
    </Button> : <span className={s.analysisEmpty}>Sin datos para graficar</span>}
    <Modal open={open} onClose={() => setOpen(false)} title={title} description={`${scope} · ${number(total)} registros`} wide>
      {visible.length ? <div className={s.modalChart}>
        <AnalyticsSculpture values={visible} variant="pie" minimal caption={caption}/>
      </div> : <p className={s.empty}>No hay registros en este conjunto.</p>}
    </Modal>
  </div>;
}
