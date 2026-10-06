'use client';

import { useEffect, type RefObject } from 'react';

/** Content is visible in SSR and without JS. Only offscreen blocks are staged. */
export function useScrollReveal(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = root.current;
    if (!container || !('IntersectionObserver' in window)) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const elements = [...container.querySelectorAll<HTMLElement>('[data-reveal]')];
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).dataset.revealState = 'visible';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .08, rootMargin: '0px 0px -16px 0px' });
    function revealAll() {
      if (preference.matches) {
        elements.forEach(element => { element.dataset.revealState = 'visible'; });
        observer.disconnect();
      }
    }
    elements.forEach(element => {
      const below = element.getBoundingClientRect().top >= window.innerHeight;
      element.dataset.revealState = !preference.matches && below ? 'pending' : 'visible';
      if (!preference.matches && below) observer.observe(element);
    });
    function focus(event: FocusEvent) {
      if (event.target instanceof HTMLElement) {
        const block = event.target.closest<HTMLElement>('[data-reveal]');
        if (block) { block.dataset.revealState = 'visible'; observer.unobserve(block); }
      }
    }
    preference.addEventListener('change', revealAll);
    container.addEventListener('focusin', focus);
    return () => { observer.disconnect(); preference.removeEventListener('change', revealAll); container.removeEventListener('focusin', focus); };
  }, [root]);
}
