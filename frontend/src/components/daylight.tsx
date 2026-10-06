'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import s from './daylight.module.css';

export type DaylightPhase = 'morning' | 'day' | 'sunset' | 'night';

function readClock(): DaylightPhase {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 16) return 'day';
  if (hour >= 16 && hour < 19) return 'sunset';
  return 'night';
}

// The static/SSR render has no light, so hydration never assumes a time zone.
function serverClock(): null { return null; }

function subscribeClock(onChange: () => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;

  function schedule() {
    clearTimeout(timer);
    if (document.hidden) return;
    const now = new Date();
    const untilNextMinute = 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds());
    timer = setTimeout(refresh, untilNextMinute);
  }

  function refresh() {
    onChange();
    schedule();
  }

  document.addEventListener('visibilitychange', refresh);
  window.addEventListener('focus', refresh);
  window.addEventListener('pageshow', refresh);
  schedule();
  return () => {
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', refresh);
    window.removeEventListener('focus', refresh);
    window.removeEventListener('pageshow', refresh);
  };
}

export function useDaylightPhase() {
  return useSyncExternalStore(subscribeClock, readClock, serverClock);
}

/** A decorative local-time source for a reserved spot in the workspace header. */
export function DaylightSource({ phase }: { phase: DaylightPhase | null }) {
  const sourceRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const source = sourceRef.current;
    const workspace = source?.closest<HTMLElement>('[data-workspace]');
    if (!source || !workspace) return;

    let disposed = false;
    function measureSource() {
      if (disposed || !source || !workspace) return;
      const bounds = source.getBoundingClientRect();
      // Keep the header's light origin steady when a resize occurs after scroll.
      // Only these private CSS coordinates change; no React render is needed.
      workspace.style.setProperty('--daylight-source-x', `${Math.round((bounds.left + bounds.width / 2) * 10) / 10}px`);
      workspace.style.setProperty('--daylight-source-y', `${Math.round((bounds.top + bounds.height / 2 + window.scrollY) * 10) / 10}px`);
    }

    measureSource();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measureSource);
    observer?.observe(source);
    if (source.parentElement) observer?.observe(source.parentElement);
    const header = source.closest('header');
    if (header) observer?.observe(header);
    window.addEventListener('resize', measureSource);
    return () => {
      disposed = true;
      observer?.disconnect();
      window.removeEventListener('resize', measureSource);
      workspace.style.removeProperty('--daylight-source-x');
      workspace.style.removeProperty('--daylight-source-y');
    };
  }, []);

  return <span ref={sourceRef} className={s.source} data-celestial={phase ?? 'day'} data-ready={phase !== null} aria-hidden="true">
    <span className={s.orb} data-daylight-orb/>
  </span>;
}

export function Daylight({ phase, surface }: {
  phase: DaylightPhase | null;
  surface: 'landing' | 'workspace';
}) {
  return <>
    <div className={s.ambience} data-daylight={phase ?? 'day'} data-ready={phase !== null} data-surface={surface} aria-hidden="true">
      <span className={s.glow}/>
      <span className={s.orb} data-daylight-orb/>
      <span className={s.rays}/>
      <span className={s.reflection}/>
    </div>
    <div className={s.lightfall} data-daylight-overlay data-phase={phase ?? 'day'} data-ready={phase !== null} data-surface={surface} aria-hidden="true"/>
  </>;
}
