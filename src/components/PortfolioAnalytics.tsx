'use client';

import Script from 'next/script';
import { useEffect } from 'react';

declare global {
  interface Window { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; }
}

const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const portfolioSite = process.env.NEXT_PUBLIC_PORTFOLIO_SITE_ID || 'nextgengear';

function sendEvent(name: string, parameters: Record<string, string | number> = {}) {
  window.gtag?.('event', name, { portfolio_site: portfolioSite, publication: portfolioSite, ...parameters });
}

function articleName() { return document.querySelector('main h1')?.textContent?.trim() || document.title; }

export function PortfolioAnalytics() {
  useEffect(() => {
    if (!measurementId) return;
    const reached = new Set<number>();
    const onScroll = () => {
      const available = document.documentElement.scrollHeight - window.innerHeight;
      if (available <= 0) return;
      const percent = Math.round((window.scrollY / available) * 100);
      for (const threshold of [50, 90]) if (percent >= threshold && !reached.has(threshold)) {
        reached.add(threshold);
        sendEvent('article_scroll', { percent_scrolled: threshold, article: articleName() });
      }
    };
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href]');
      if (!anchor) return;
      const url = new URL(anchor.href, window.location.href);
      const explicit = anchor.dataset.analyticsEvent;
      const common = { article: articleName(), placement: anchor.dataset.placement || 'link' };
      if (explicit) sendEvent(explicit, { ...common, merchant: anchor.dataset.merchant || url.hostname });
      else if (anchor.rel.includes('sponsored') || anchor.dataset.affiliate === 'true') sendEvent('affiliate_click', { ...common, merchant: anchor.dataset.merchant || url.hostname });
      else if (url.origin !== window.location.origin) sendEvent('outbound_click', { ...common, destination: url.hostname });
      else sendEvent('internal_recirculation', { ...common, destination: url.pathname });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('click', onClick);
    return () => { window.removeEventListener('scroll', onScroll); document.removeEventListener('click', onClick); };
  }, []);
  if (!measurementId) return null;
  return <>
    <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
    <Script id="portfolio-ga4" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config','${measurementId}',{portfolio_site:'${portfolioSite}',publication:'${portfolioSite}'});`}</Script>
  </>;
}
