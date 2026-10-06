'use client';

import { useEffect, useRef } from 'react';
import s from './prismatic-text.module.css';

export type PrismaticTextProps = {
  children: string;
  tone?: 'iris' | 'blue' | 'jade' | 'copper';
  className?: string;
};

/** An original optical finish. The heading owns its semantics and typography. */
export function PrismaticText({ children, tone = 'iris', className }: PrismaticTextProps) {
  const text = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = text.current;
    if (!element) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const contrast = window.matchMedia('(forced-colors: active)');
    let visible = false;
    let revealed = false;
    let disposed = false;
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let bounds: DOMRect | undefined;
    let pointer = .5;
    let observer: IntersectionObserver | undefined;
    const reduced = () => motion.matches || contrast.matches;

    function finishEntrance() {
      clearTimeout(timer);
      timer = undefined;
      element!.dataset.prismState = 'idle';
    }
    function rest() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      element!.dataset.engaged = 'false';
      element!.style.removeProperty('--prism-position');
      element!.style.removeProperty('--prism-ray');
    }
    function suspend() {
      finishEntrance();
      rest();
      element!.dataset.prismState = 'paused';
    }
    function enterView() {
      if (!visible || document.hidden || disposed) return;
      if (element!.dataset.prismState === 'paused') element!.dataset.prismState = 'idle';
      if (revealed) return;
      revealed = true;
      if (reduced()) return;
      element!.dataset.prismState = 'enter';
      // Both CSS tracks finish within 1.2s. Remove the animation state as well,
      // so a resting title owns no persistent animation or timer.
      timer = setTimeout(finishEntrance, 1250);
    }
    function updatePreference() {
      element!.dataset.motion = reduced() ? 'reduced' : 'full';
      if (!visible || document.hidden) { suspend(); return; }
      if (reduced()) { finishEntrance(); rest(); }
      enterView();
    }
    function measure() { bounds = element!.getBoundingClientRect(); }
    function move(event: PointerEvent) {
      if (event.pointerType !== 'mouse' || reduced() || document.hidden || disposed) return;
      if (!visible || element!.dataset.engaged !== 'true') {
        measure();
        if (!bounds?.width || !bounds.height ||
          event.clientX < Math.max(0, bounds.left) || event.clientX > Math.min(window.innerWidth, bounds.right) ||
          event.clientY < Math.max(0, bounds.top) || event.clientY > Math.min(window.innerHeight, bounds.bottom)) return;
        // A real pointer can arrive before the IntersectionObserver delivery
        // after scroll. Its visible hit is authoritative for this interaction.
        // Move also re-engages a cursor kept inside while preferences changed.
        visible = true;
        revealed = true;
        finishEntrance();
        element!.dataset.engaged = 'true';
      }
      if (!bounds) measure();
      if (!bounds?.width) return;
      pointer = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (disposed || reduced() || !visible || document.hidden) return;
        // A 240%-wide gradient maps its highlight back to the pointer position.
        // Coalescing pointer events requires no continuously running frame loop.
        element!.style.setProperty('--prism-position', `${86 - pointer * 72}%`);
        element!.style.setProperty('--prism-ray', `${8 + pointer * 84}%`);
      });
    }
    function engage(event: PointerEvent) {
      bounds = undefined;
      move(event);
    }
    function visibility() {
      if (document.hidden) suspend();
      else enterView();
    }

    updatePreference();
    element.addEventListener('pointerenter', engage);
    element.addEventListener('pointermove', move);
    element.addEventListener('pointerleave', rest);
    element.addEventListener('pointercancel', rest);
    motion.addEventListener('change', updatePreference);
    contrast.addEventListener('change', updatePreference);
    document.addEventListener('visibilitychange', visibility);
    const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    resize?.observe(element);
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        visible = entries.some(entry => entry.isIntersecting);
        if (visible) enterView();
        else suspend();
      }, { threshold: .2 });
      observer.observe(element);
    } else { visible = true; enterView(); }

    return () => {
      disposed = true;
      finishEntrance();
      rest();
      observer?.disconnect();
      resize?.disconnect();
      element.removeEventListener('pointerenter', engage);
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerleave', rest);
      element.removeEventListener('pointercancel', rest);
      motion.removeEventListener('change', updatePreference);
      contrast.removeEventListener('change', updatePreference);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);

  return <span ref={text} className={`${s.text}${className ? ` ${className}` : ''}`} data-prismatic-text={tone} data-motion="static" data-prism-state="idle" data-engaged="false">{children}</span>;
}
