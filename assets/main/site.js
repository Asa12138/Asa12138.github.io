/* The English pages and their links remain usable without JavaScript. */
(() => {
  'use strict';

  const root = document.documentElement;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const themePreference = matchMedia('(prefers-color-scheme: dark)');
  const languageKey = 'asa-main-language-v1';
  const themeKey = 'asa-main-theme-v1';
  const mainPages = new Set([
    '/', '/index.html', '/works.html', '/development.html', '/others.html',
    '/books/', '/books/index.html', '/FileList/', '/FileList/index.html',
    '/databases/', '/databases/index.html', '/wp.html', '/404.html'
  ]);
  const searchLanguage = new URLSearchParams(location.search).get('lang');
  let language = ['en', 'zh'].includes(searchLanguage) ? searchLanguage : readPreference(languageKey) === 'zh' ? 'zh' : 'en';

  function readPreference(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function savePreference(key, value) {
    try { localStorage.setItem(key, value); } catch {}
  }

  function localize(key, english) {
    return language === 'zh' ? window.ASA_ZH?.[key] ?? english : english;
  }

  const translationTargets = ['text', 'placeholder', 'aria-label', 'alt'].flatMap(attribute => {
    const marker = attribute === 'text' ? 'data-i18n' : 'data-i18n-' + attribute;
    return [...document.querySelectorAll('[' + marker + ']')].map(node => ({
      node, attribute, key: node.getAttribute(marker),
      original: attribute === 'text' ? node.textContent : node.getAttribute(attribute)
    }));
  });

  const languageButton = document.querySelector('.language-toggle');
  const themeButton = document.querySelector('.theme-toggle');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  let themeChoice = readPreference(themeKey);
  if (themeChoice !== 'light' && themeChoice !== 'dark') themeChoice = null;

  function applyTheme(theme) {
    root.dataset.theme = theme;
    if (themeMeta) themeMeta.content = theme === 'dark' ? '#0e161d' : '#f4f7fb';
    themeButton?.setAttribute('aria-pressed', String(theme === 'dark'));
    const label = theme === 'dark'
      ? localize('theme-to-light', 'Switch to light mode')
      : localize('theme-to-dark', 'Switch to dark mode');
    themeButton?.setAttribute('aria-label', label);
    if (themeButton) themeButton.title = label;
  }

  function preferredTheme() {
    return themeChoice ?? (themePreference.matches ? 'dark' : 'light');
  }

  if (themeButton) {
    themeButton.hidden = false;
    themeButton.addEventListener('click', () => {
      themeChoice = root.dataset.theme === 'dark' ? 'light' : 'dark';
      root.classList.add('theme-animated');
      applyTheme(themeChoice);
      savePreference(themeKey, themeChoice);
    });
  }
  themePreference.addEventListener('change', () => applyTheme(preferredTheme()));
  addEventListener('storage', event => {
    if (event.key !== themeKey && event.key !== null) return;
    themeChoice = ['light', 'dark'].includes(event.newValue) ? event.newValue : null;
    applyTheme(preferredTheme());
  });

  const animation = document.querySelector('.package-animation');
  const animationPoster = document.querySelector('.animation-poster');
  const animationButton = document.querySelector('.animation-toggle');
  let animationPaused = false;

  function updateAnimation() {
    if (!animation || !animationButton || !animationPoster) return;
    animation.hidden = animationPaused || motion.matches;
    animationPoster.hidden = !animation.hidden;
    animationButton.hidden = motion.matches;
    animationButton.setAttribute('aria-pressed', String(animationPaused));
    animationButton.querySelector('[data-animation-label]').textContent = animationPaused
      ? localize('play-animation', 'Play animation')
      : localize('pause-animation', 'Pause animation');
  }

  animationButton?.addEventListener('click', () => {
    animationPaused = !animationPaused;
    updateAnimation();
  });
  motion.addEventListener('change', updateAnimation);

  function applyLanguage(next) {
    language = next;
    const chinese = language === 'zh';
    root.lang = chinese ? 'zh-CN' : 'en';
    for (const {node, attribute, key, original} of translationTargets) {
      const value = localize(key, original);
      if (attribute === 'text') node.textContent = value;
      else node.setAttribute(attribute, value);
    }
    document.title = (chinese ? document.body.dataset.titleZh : document.body.dataset.titleEn) + ' · Chen Peng / Asa';
    if (languageButton) {
      languageButton.querySelector('.language-label').textContent = chinese ? 'EN' : '中文';
      languageButton.setAttribute('aria-label', chinese ? 'Switch to English' : '切换到中文');
    }
    savePreference(languageKey, language);
    for (const link of document.querySelectorAll('a[href]')) {
      const href = link.getAttribute('href');
      if (href.startsWith('#')) continue;
      const url = new URL(href, location.href);
      if (url.origin !== location.origin || !mainPages.has(url.pathname)) continue;
      url.searchParams.set('lang', language);
      link.setAttribute('href', url.pathname + url.search + url.hash);
    }
    applyTheme(preferredTheme());
    updateAnimation();
    document.dispatchEvent(new Event('asa:languagechange'));
  }

  applyLanguage(language);
  if (languageButton && window.ASA_ZH) {
    languageButton.hidden = false;
    languageButton.addEventListener('click', () => {
      applyLanguage(language === 'en' ? 'zh' : 'en');
      const url = new URL(location.href);
      url.searchParams.set('lang', language);
      try { history.replaceState(null, '', url.pathname + url.search + url.hash); } catch {}
    });
  }

  for (const node of document.querySelectorAll('[data-year]')) node.textContent = String(new Date().getFullYear());
  for (const node of document.querySelectorAll('[data-needs-js]')) node.hidden = false;

  const header = document.querySelector('.site-header');
  const progress = header?.querySelector('.scroll-progress');
  const railLinks = [...document.querySelectorAll('.page-rail nav a[href^="#"]')]
    .map(link => ({link, target: document.getElementById(link.hash.slice(1))}))
    .filter(item => item.target);
  const railGroups = document.querySelectorAll('.rail-group');
  let scrollFrame = 0;

  function updateScroll() {
    scrollFrame = 0;
    header?.classList.toggle('is-scrolled', scrollY > 24);
    const scrollable = document.documentElement.scrollHeight - innerHeight;
    const ratio = scrollable > 0 ? Math.max(0, Math.min(1, scrollY / scrollable)) : 0;
    if (progress) progress.style.transform = 'scaleX(' + ratio + ')';
    const offset = (header?.offsetHeight ?? 0) + 56;
    let active;
    for (const item of railLinks) {
      if (item.target.closest('[hidden]')) continue;
      if (!active || item.target.getBoundingClientRect().top <= offset) active = item;
    }
    for (const {link} of railLinks) {
      if (link === active?.link) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
    for (const group of railGroups) group.classList.toggle('contains-current', Boolean(active && group.contains(active.link)));
  }

  function requestScrollUpdate() {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
  }

  addEventListener('scroll', requestScrollUpdate, {passive: true});
  addEventListener('resize', requestScrollUpdate);
  if ('ResizeObserver' in window) new ResizeObserver(requestScrollUpdate).observe(document.querySelector('main'));

  function normalizeSearch(text) {
    return text.normalize('NFKD').toLowerCase().replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  }

  function initializeFilter(container, searchableText) {
    const input = container.querySelector('[data-filter-search]');
    const buttons = [...container.querySelectorAll('button[data-filter]')];
    const items = [...container.querySelectorAll('[data-filter-item]')];
    const groups = [...container.querySelectorAll('[data-filter-group]')];
    const empty = container.querySelector('[data-empty]');
    const count = container.querySelector('[data-match-count]');
    const total = container.querySelector('[data-result-total]');
    let active = 'all';
    let searchable = [];

    function update() {
      const terms = normalizeSearch(input.value).split(' ').filter(Boolean);
      let matching = 0;
      items.forEach((item, index) => {
        const matchesFilter = active === 'all' || item.dataset.filterItem === active;
        const {text, words} = searchable[index];
        // Keep short substring searches useful without matching "Hao" inside "Chao" in a full author name.
        const matchesSearch = terms.every(term => terms.length > 1 && /^[a-z0-9]+$/.test(term)
          ? words.some(word => word.startsWith(term))
          : text.includes(term));
        item.hidden = !matchesFilter || !matchesSearch;
        if (!item.hidden) matching++;
      });
      for (const group of groups) group.hidden = !group.querySelector('[data-filter-item]:not([hidden])');
      for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.filter === active));
      empty.hidden = matching > 0;
      if (count.textContent !== String(matching)) {
        count.textContent = matching;
        if (!motion.matches) count.animate?.([{opacity: .55}, {opacity: 1}], {duration: 180, easing: 'ease-out'});
      }
      requestScrollUpdate();
    }

    function refreshSearch() {
      searchable = items.map(item => {
        const text = normalizeSearch(searchableText(item));
        return {text, words: text.split(' ')};
      });
      update();
    }

    for (const button of buttons) {
      button.addEventListener('click', () => {
        active = button.dataset.filter;
        update();
      });
    }
    input.addEventListener('input', event => { if (!event.isComposing) update(); });
    input.addEventListener('compositionend', update);
    document.addEventListener('asa:languagechange', refreshSearch);
    total.textContent = items.length;
    refreshSearch();

    return () => {
      input.value = '';
      active = 'all';
      update();
    };
  }

  function initPublications(container) {
    const publications = [...container.querySelectorAll('.publication')];
    const years = new Map();
    let preprints = 0;
    for (const article of publications) {
      const year = article.dataset.filterItem;
      const record = years.get(year) ?? {journal: 0, preprint: 0};
      if (article.closest('#preprints')) {
        record.preprint++;
        preprints++;
      } else {
        record.journal++;
      }
      years.set(year, record);
    }
    const total = container.querySelector('[data-publication-total]');
    total.textContent = publications.length;
    total.dataset.count = publications.length;
    container.querySelector('[data-journal-total]').textContent = publications.length - preprints;
    container.querySelector('[data-preprint-total]').textContent = preprints;

    const max = Math.max(1, ...[...years.values()].map(year => year.journal + year.preprint));
    const bars = [...container.querySelectorAll('.year-bar')];
    function labelChart() {
      for (const bar of bars) {
        const year = bar.dataset.filter;
        const {journal, preprint} = years.get(year) ?? {journal: 0, preprint: 0};
        const count = journal + preprint;
        bar.style.setProperty('--bar-ratio', count / max);
        bar.style.setProperty('--bar-preprint-share', (count ? preprint / count : 0) * 100 + '%');
        bar.querySelector('.bar-value').textContent = count;
        bar.setAttribute('aria-label', localize('pub-chart-bar', '{year}: {count} research records')
          .replace('{year}', year).replace('{count}', count));
      }
    }
    labelChart();
    document.addEventListener('asa:languagechange', labelChart);

    const reset = initializeFilter(container, item =>
      item.querySelector('.pub-title').textContent + ' ' +
      item.querySelector('.pub-journal').textContent + ' ' +
      item.querySelector('.pub-authors').dataset.bibAuthors + ' ' +
      item.querySelector('.pub-authors').textContent + ' ' +
      item.querySelector('.doi').textContent
    );
    for (const {link, target} of railLinks) {
      link.addEventListener('click', () => { if (target.closest('[hidden]')) reset(); });
    }
  }

  const publications = document.querySelector('[data-publication-browser]');
  if (publications) initPublications(publications);
  const downloads = document.querySelector('[data-file-browser]');
  if (downloads) {
    const english = new Map([...downloads.querySelectorAll('[data-filter-item]')]
      .map(file => [file, translationTargets.find(target => target.node === file.querySelector('p'))?.original ?? '']));
    initializeFilter(downloads, file => file.querySelector('h3').textContent + ' ' + file.querySelector('p').textContent + ' ' + english.get(file));
  }

  const projectFilters = [...document.querySelectorAll('[data-project-filter]')];
  if (projectFilters.length) {
    const groups = [...document.querySelectorAll('[data-project-group]')];
    function filterProjects(category) {
      for (const group of groups) group.hidden = category !== 'all' && group.dataset.projectGroup !== category;
      for (const button of projectFilters) button.setAttribute('aria-pressed', String(button.dataset.projectFilter === category));
      requestScrollUpdate();
    }
    for (const count of document.querySelectorAll('[data-project-count]')) {
      const size = groups.filter(group => group.dataset.projectGroup === count.dataset.projectCount)
        .reduce((sum, group) => sum + group.querySelectorAll('.project-card').length, 0);
      count.textContent = '(' + size + ')';
    }
    for (const button of projectFilters) button.addEventListener('click', () => filterProjects(button.dataset.projectFilter));
    for (const {link, target} of railLinks) {
      link.addEventListener('click', () => { if (target.closest('[hidden]')) filterProjects('all'); });
    }
  }

  const toastMessages = {
    copied: ['toast-copied', 'Copied to clipboard'],
    doi: ['toast-doi-copied', 'DOI copied'],
    bibtex: ['toast-bib-copied', 'BibTeX citation copied'],
    install: ['toast-cmd-copied', 'Install command copied'],
    wechat: ['toast-wechat-copied', 'WeChat name copied'],
    download: ['toast-downloading', 'Starting download'],
    copyError: ['toast-copy-failed', 'Copy is unavailable in this browser.'],
    videoError: ['toast-video-failed', 'Use the player controls to play the video.']
  };

  const toast = document.createElement('div');
  toast.className = 'site-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-atomic', 'true');
  document.body.append(toast);
  let toastTimer, activeToast;

  function showToast(message) {
    activeToast = message;
    toast.textContent = localize(...toastMessages[message]);
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('is-visible');
      toast.textContent = '';
      activeToast = null;
    }, 2400);
  }

  document.addEventListener('asa:languagechange', () => {
    if (activeToast) toast.textContent = localize(...toastMessages[activeToast]);
  });

  async function copyText(value) {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch {}
    }
    const area = document.createElement('textarea');
    const focused = document.activeElement;
    area.className = 'visually-hidden';
    area.value = value;
    area.readOnly = true;
    document.body.append(area);
    area.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch {}
    area.remove();
    focused?.focus({preventScroll: true});
    return copied;
  }

  function bibtex(article) {
    const title = article.querySelector('.pub-title').textContent.trim();
    const authors = article.querySelector('.pub-authors').dataset.bibAuthors;
    const journal = article.querySelector('.journal-pill').textContent;
    const year = article.querySelector('time').dateTime;
    const doi = article.querySelector('.doi').textContent;
    const key = authors.split(',')[0].normalize('NFKD').replace(/[^A-Za-z]/g, '') + year + doi.replace(/.*\//, '').replace(/[^a-z0-9]/gi, '');
    const special = {
      '\\': '\\textbackslash{}', '{': '\\{', '}': '\\}', '&': '\\&',
      '%': '\\%', '$': '\\$', '#': '\\#', '_': '\\_', '~': '\\textasciitilde{}', '^': '\\textasciicircum{}'
    };
    const escape = text => text.replace(/[\\{}&%$#_~^]/g, char => special[char]);
    const fields = {title: '{' + escape(title) + '}', author: escape(authors), journal: escape(journal), year, doi: escape(doi)};
    if (article.closest('#preprints')) fields.note = 'Preprint';
    const lines = Object.entries(fields).map(([field, value]) => '  ' + field + ' = {' + value + '}');
    return '@article{' + key + ',\n' + lines.join(',\n') + '\n}';
  }

  document.addEventListener('click', async event => {
    const copy = event.target.closest('button[data-copy]');
    if (copy) {
      const kind = copy.dataset.copy;
      let content;
      if (kind === 'doi') content = copy.closest('.publication').querySelector('.doi').textContent;
      if (kind === 'bibtex') content = bibtex(copy.closest('.publication'));
      if (kind === 'install') content = copy.closest('.install-command').querySelector('code').textContent;
      if (kind === 'wechat') content = document.querySelector('#wechat-name').textContent;
      if (content) showToast(await copyText(content) ? kind : 'copyError');
    }
    if (event.target.closest('a[data-download]')) showToast('download');
  });

  function initLightbox() {
    if (!document.querySelector('[data-lightbox]')) return;
    const dialog = document.createElement('dialog');
    if (typeof dialog.showModal !== 'function') return;
    dialog.className = 'lightbox';
    dialog.innerHTML = `
      <figure class="lightbox-panel">
        <button class="lightbox-close" type="button" autofocus>
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
        </button>
        <div class="lightbox-image"></div>
        <figcaption></figcaption>
      </figure>`;
    document.body.append(dialog);
    const stage = dialog.querySelector('.lightbox-image');
    const caption = dialog.querySelector('figcaption');
    const close = dialog.querySelector('button');
    let trigger;

    function labelLightbox() {
      dialog.setAttribute('aria-label', localize('lightbox-label', 'Image preview'));
      close.setAttribute('aria-label', localize('lightbox-close', 'Close image preview'));
      if (trigger) {
        const desc = trigger.querySelector('img')?.alt ?? trigger.querySelector('svg')?.getAttribute('aria-label') ?? '';
        caption.textContent = desc;
        caption.hidden = !desc;
        stage.querySelector('img')?.setAttribute('alt', desc);
      }
    }
    document.addEventListener('asa:languagechange', labelLightbox);

    document.addEventListener('click', event => {
      const link = event.target.closest('a[data-lightbox]');
      if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const illustration = link.querySelector('svg[role="img"]');
      const visual = illustration ? illustration.cloneNode(true) : new Image();
      if (!illustration) visual.src = link.href;
      event.preventDefault();
      trigger = link;
      stage.replaceChildren(visual);
      labelLightbox();
      dialog.showModal();
      root.classList.add('lightbox-open');
    });
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => {
      root.classList.remove('lightbox-open');
      stage.replaceChildren();
      trigger?.focus({preventScroll: true});
      trigger = null;
    });
  }
  initLightbox();

  const film = document.querySelector('.film-screen video');
  const filmPlay = document.querySelector('.film-play');
  if (film && filmPlay) {
    film.controls = false;
    function usePlayerControls() {
      const hadFocus = document.activeElement === filmPlay;
      filmPlay.hidden = true;
      film.controls = true;
      if (hadFocus) film.focus({preventScroll: true});
    }
    filmPlay.addEventListener('click', async () => {
      try {
        await film.play();
      } catch {
        usePlayerControls();
        showToast('videoError');
      }
    });
    film.addEventListener('play', usePlayerControls, {once: true});
  }

  if ('IntersectionObserver' in window) {
    const reveal = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting && entry.boundingClientRect.bottom > 0) continue;
        entry.target.classList.add('is-visible');
        reveal.unobserve(entry.target);
      }
    }, {threshold: 0.08, rootMargin: '0px 0px 24px'});
    if (!motion.matches) {
      for (const node of document.querySelectorAll('[data-reveal]')) {
        if (!node.closest('[hidden]') && node.getBoundingClientRect().top < innerHeight) {
          node.classList.add('is-visible');
          continue;
        }
        const index = [...node.parentElement.children].filter(child => child.hasAttribute('data-reveal')).indexOf(node);
        node.style.setProperty('--reveal-delay', Math.min(Math.max(index, 0), 4) * 55 + 'ms');
        node.classList.add('will-reveal');
        reveal.observe(node);
      }
    }
    const counts = new IntersectionObserver(entries => {
      for (const {isIntersecting, target} of entries) {
        if (!isIntersecting) continue;
        counts.unobserve(target);
        const value = target.dataset.count.match(/^(\d+)(.*)$/);
        if (!value || motion.matches) continue;
        const [, digits, suffix] = value;
        const start = performance.now();
        function tick(now) {
          const t = motion.matches ? 1 : Math.min(1, (now - start) / 700);
          target.textContent = Math.round(Number(digits) * (1 - (1 - t) ** 3)) + suffix;
          if (t < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      }
    }, {threshold: 0.25});
    for (const node of document.querySelectorAll('[data-count]')) counts.observe(node);
  }

  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  function trackPointer(element, update, reset) {
    let frame = 0;
    element.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch' || !pointer.matches || motion.matches) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const bounds = element.getBoundingClientRect();
        const x = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
        const y = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));
        update(element.style, x, y);
      });
    }, {passive: true});
    function clear() {
      cancelAnimationFrame(frame);
      for (const property of reset) element.style.removeProperty(property);
    }
    element.addEventListener('pointerleave', clear);
    motion.addEventListener('change', clear);
    pointer.addEventListener('change', clear);
  }

  for (const card of document.querySelectorAll('.project-card, .topic-card, .book-row')) {
    trackPointer(card, (style, x, y) => {
      style.setProperty('--mx', x * 100 + '%');
      style.setProperty('--my', y * 100 + '%');
    }, ['--mx', '--my']);
  }

  for (const cover of document.querySelectorAll('[data-tilt], .portrait-note')) {
    trackPointer(cover, (style, x, y) => {
      style.setProperty('--rx', (0.5 - y) * 12 + 'deg');
      style.setProperty('--ry', (x - 0.5) * 12 + 'deg');
    }, ['--rx', '--ry']);
  }

  const board = document.querySelector('.fieldboard');
  if (board) {
    trackPointer(board, (style, x, y) => {
      style.setProperty('--board-x', (x - 0.5) * 24 + 'px');
      style.setProperty('--board-y', (y - 0.5) * 24 + 'px');
    }, ['--board-x', '--board-y']);

    const nodes = [...board.querySelectorAll('[data-graph-node]')];
    const edges = board.querySelectorAll('[data-graph-edge]');
    const tips = board.querySelectorAll('[data-graph-tip]');
    function showNode(node) {
      const name = node?.dataset.graphNode;
      board.classList.toggle('has-active-node', Boolean(name));
      for (const edge of edges) edge.classList.toggle('is-active', Boolean(name && edge.dataset.graphEdge.split(' ').includes(name)));
      for (const item of nodes) item.classList.toggle('is-active', item === node);
      for (const tip of tips) tip.hidden = tip.dataset.graphTip !== name;
    }
    for (const node of nodes) {
      node.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') showNode(node); });
      node.addEventListener('pointerleave', () => showNode(nodes.find(item => item === document.activeElement)));
      node.addEventListener('focus', () => showNode(node));
      node.addEventListener('blur', () => showNode(nodes.find(item => item.matches(':hover'))));
      node.addEventListener('keydown', event => { if (event.key === 'Escape') showNode(); });
    }
  }

  requestScrollUpdate();
})();
