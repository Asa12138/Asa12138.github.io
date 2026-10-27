/* Static English HTML remains fully readable without JavaScript. */
(() => {
  'use strict';
  const key = 'asa-main-language-v1';
  const button = document.querySelector('.language-toggle');
  const nodes = [...document.querySelectorAll('[data-i18n]')];
  const english = new Map(nodes.map(node => [node, node.textContent]));
  const parameter = new URLSearchParams(location.search).get('lang');
  let language = ['en', 'zh'].includes(parameter) ? parameter : 'en';
  try { if (!['en', 'zh'].includes(parameter) && localStorage.getItem(key) === 'zh') language = 'zh'; } catch {}
  const mainPages = new Set(['/','/index.html','/works.html','/development.html','/others.html','/books/','/books/index.html','/FileList/','/FileList/index.html','/databases/','/databases/index.html','/wp.html','/404.html']);
  const animation = document.querySelector('.package-animation');
  const animationPoster = document.querySelector('.animation-poster');
  const animationButton = document.querySelector('.animation-toggle');
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = motionQuery.matches;
  function updateAnimation() {
    if (!animation) return;
    animation.hidden = paused || motionQuery.matches;
    animationPoster.hidden = !animation.hidden;
    animationButton.hidden = motionQuery.matches;
    animationButton.setAttribute('aria-pressed', String(paused));
    animationButton.querySelector('span').textContent = language === 'zh' ? (paused ? '播放动图' : '暂停动图') : (paused ? 'Play animation' : 'Pause animation');
  }
  function applyLanguage(next) {
    language = next;
    const zh = language === 'zh';
    document.documentElement.lang = zh ? 'zh-CN' : 'en';
    nodes.forEach(node => { node.textContent = zh ? window.ASA_ZH?.[node.dataset.i18n] ?? english.get(node) : english.get(node); });
    document.title = (zh ? document.body.dataset.titleZh : document.body.dataset.titleEn) + ' · Chen Peng / Asa';
    if (button) {
      button.querySelector('.language-label').textContent = zh ? 'EN' : '中文';
      button.setAttribute('aria-label', zh ? 'Switch to English' : '切换到中文');
    }
    document.querySelector('.primary-nav')?.setAttribute('aria-label', zh ? '主导航' : 'Main navigation');
    document.querySelector('.page-rail nav')?.setAttribute('aria-label', zh ? '本页导航' : 'On this page');
    try { localStorage.setItem(key, language); } catch {}
    document.querySelectorAll('a[href]').forEach(link => {
      const raw = link.getAttribute('href');
      if (raw.startsWith('#')) return;
      const url = new URL(raw, location.href);
      if (url.origin === location.origin && mainPages.has(url.pathname)) {
        url.searchParams.set('lang', language);
        link.setAttribute('href', url.pathname + url.search + url.hash);
      }
    });
    updateAnimation();
  }
  if (button && window.ASA_ZH) {
    button.hidden = false;
    applyLanguage(language);
    button.addEventListener('click', () => {
      applyLanguage(language === 'en' ? 'zh' : 'en');
      const url = new URL(location.href);
      url.searchParams.set('lang', language);
      try { history.replaceState(null, '', url.pathname + url.search + url.hash); } catch {}
    });
  }
  animationButton?.addEventListener('click', () => { paused = !paused; updateAnimation(); });
  motionQuery.addEventListener('change', () => { paused = motionQuery.matches; updateAnimation(); });
  updateAnimation();
  document.querySelectorAll('[data-year]').forEach(node => { node.textContent = String(new Date().getFullYear()); });
  const sections = [...document.querySelectorAll('.page-rail nav a[href^="#"]')].map(link => ({link, target:document.getElementById(link.hash.slice(1))})).filter(item => item.target);
  let queued = false;
  function updateSection() {
    queued = false;
    let active = sections[0];
    for (const item of sections) if (item.target.getBoundingClientRect().top <= 160) active = item;
    sections.forEach(item => { if (item === active) item.link.setAttribute('aria-current','location'); else item.link.removeAttribute('aria-current'); });
    document.querySelectorAll('.rail-group').forEach(group => {
      group.classList.toggle('contains-current', Boolean(active && group.contains(active.link)));
    });
  }
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(updateSection); } }, {passive:true});
  addEventListener('resize', updateSection);
  updateSection();
})();
