// File: scripts/loadContent.js
// NOTE: a-CLICK a link to copy a full HTML URL. 
// E.g. <li><a href="?path=Algorithms%2FGreedy%2FMerge">Merge</a></li>
// Documented here to remind me.
history.scrollRestoration = 'manual';


let aKeyDown = false;
window.addEventListener('keydown', (e) => {
  if (e.key === 'a' || e.key === 'A') aKeyDown = true;
});
window.addEventListener('keyup', (e) => {
  if (e.key === 'a' || e.key === 'A') aKeyDown = false;
});
window.addEventListener('blur', () => aKeyDown = false);


// ─── Ordering Constants ───────────────────────────────────────────────────────
const TOP_LEVEL_ORDER = [
  'Home',
  'Problems',
  'Data Structures',
  'Techniques',
  'Algorithms',
  'Demos',
  'More'
];
const PROBLEMS_ORDER = [
  'Foundational',
  'Problem List',
  'Optimization',
  'Geometry',
  'Graphs',
  'Other'
];
const ALGORITHMS_ORDER = [
  'Introduction',
  'Brute Force',
  'Exhaustive Search',
  'Divide-and-Conquer',
  'Decrease-and-Conquer',
  'Greedy',
  'Greedy Algorithms',
  'Dynamic Programming',
  'Transform-and-Conquer',
  'Space-Time Tradeoff',
  'Backtracking',
  'Branch-and-Bound',
  'Randomized'
];
const DECREASE_AND_CONQUER_ORDER = [
  'Introduction',
  'Decrease-by-a-Constant',
  'Decrease-by-a-Constant-Factor',
  'Variable-Size-Decrease',
  'Summary'
];

// For "Demos", we just mirror the same order as the algorithm names:
const DEMOS_ORDER = [...ALGORITHMS_ORDER];
const TECHNIQUES_ORDER = [...ALGORITHMS_ORDER];

// ─── Utility Functions ────────────────────────────────────────────────────────
// Return the current “path” either from history.state or URL param or fallback
const getCurrentPath = () =>
  history.state?.path ||
  new URLSearchParams(window.location.search).get('path') ||
  'Home/About';

// Ensure each segment of a path is properly URI‐encoded (but not double‐encoded)
const normalizePath = (path) =>
  path
    .split('/')
    .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
    .join('/');

// Extract a “key” from either a string filename or an object entry
const getKey = (entry) =>
  typeof entry === 'string'
    ? entry.replace(/\.html$/, '')
    : Object.keys(entry)[0];

// -----------------------------------------------------------------
function highlightActiveLink(path) {
  document.querySelectorAll('#menu a').forEach(a => {
    const aPath = new URLSearchParams(a.href.split('?')[1]).get('path');
    a.classList.toggle('active', aPath === path);
  });
}
// -----------------------------------------------------------------


// ─── Resize Helpers ──────────────────────────────────────────────────────────
// Get the iframe's Document object (handles both contentDocument & contentWindow)
const getIframeDocument = (frame) =>
  frame.contentDocument || frame.contentWindow.document;

// Compute the “auto + 5% up to 250px” height for any iframe‐doc combo
const computeIframeHeight = (doc) => {
  const body = doc.body;
  const html = doc.documentElement;
  const contentHeight = Math.max(
    body.scrollHeight, body.offsetHeight,
    html.clientHeight, html.scrollHeight, html.offsetHeight
  );
  const marginBottom = parseFloat(
    doc.defaultView.getComputedStyle(body).marginBottom
  ) || 0;
  const baseHeight = contentHeight + marginBottom;
  const fivePct = Math.ceil(baseHeight * 0.05);
  const buffer = Math.min(250, fivePct);
  return baseHeight + buffer;
};

// ─── Navigation / Scroll‐State / Content Loading ─────────────────────────────
let pendingScrollRestore = null;

const navigateTo = (rawPath) => {
  const currentPath = getCurrentPath();
  if (rawPath === currentPath) return;

  // 1) Save old scroll position
  const oldScrollY = window.pageYOffset;
  history.replaceState(
    { path: currentPath, scrollY: oldScrollY },
    '',
    `?path=${normalizePath(currentPath)}`
  );

  // 2) Push new entry
  const safe = normalizePath(rawPath);
  history.pushState(
    { path: rawPath, scrollY: 0 },
    '',
    `?path=${safe}`
  );

  // 3) Load
  window.scrollTo(0, 0);
  loadContent(`${safe}.html`);
  
  highlightActiveLink(rawPath);

};

const loadFromURLParams = () => {
  const rawPath = new URLSearchParams(window.location.search).get('path') || 'Home/About';
  highlightActiveLink(rawPath);
  loadContent(`${normalizePath(rawPath)}.html`);
};

// ─── iframe Hooking & Resizing ───────────────────────────────────────────────
function hookIframeContent(iframe) {
  const innerDoc = getIframeDocument(iframe);
  if (!innerDoc) return;

  // Inject glossary-tooltips.js (fresh each time)
  const head = innerDoc.head || innerDoc.getElementsByTagName('head')[0];
  const old = innerDoc.getElementById('glossary-tooltips-script');
  if (old) old.remove();
  const scriptTips = innerDoc.createElement('script');
  scriptTips.id = 'glossary-tooltips-script';
  scriptTips.type = 'module';
  scriptTips.src = `/Algorithms/scripts/glossary-tooltips.js?cb=${Date.now()}`;
  head.appendChild(scriptTips);

  // Insert a visible DRAFT banner in the HOST page (outside the iframe)
  // so it does NOT follow into fullscreen when the iframe enters fullscreen.
  (function manageDraftBannerHost(doc, hostDoc, hostIframe) {
    if (!doc || !hostDoc || !hostIframe) return;

    const createHostBanner = () => {
      const b = hostDoc.createElement('div');
      b.id = 'draft-banner-host';
      b.textContent = 'DRAFT';
      b.style.cssText = [
        'color:#b00000',
        'font-size:28px',
        'font-weight:700',
        'text-align:center',
        'padding:4px 0',
        'background:rgba(255,0,0,0.05)',
        'border:1px solid rgba(176,0,0,0.2)',
        'border-radius:6px',
        'margin:6px 0',
        'position:relative',
        'z-index:2',
        'box-sizing:border-box'
      ].join(';');
      return b;
    };

    const getDocName = () => {
      try {
        const loc = doc.defaultView?.location || doc.location;
        if (!loc) return '';
        const parts = loc.pathname ? loc.pathname.split('/') : [];
        return decodeURIComponent(parts.pop() || '').toUpperCase();
      } catch (e) {
        return '';
      }
    };

    const ensureContentWrapper = () => {
      // Wrap the iframe (and error message) in a right-side column so a banner
      // can sit above the content only, not above the left menu.
      const container = hostDoc.getElementById('container');
      if (!container) return null;
      let wrapper = hostDoc.getElementById('content-wrapper');
      if (!wrapper) {
        wrapper = hostDoc.createElement('div');
        wrapper.id = 'content-wrapper';
        wrapper.style.cssText = [
          'display:flex',
          'flex-direction:column',
          'flex:1 1 auto',
          'min-width:0'
        ].join(';');
        // Insert wrapper before the iframe, then move iframe (and any error box) inside it
        if (hostIframe && hostIframe.parentNode === container) {
          container.insertBefore(wrapper, hostIframe);
          wrapper.appendChild(hostIframe);
        }
        const err = hostDoc.getElementById('errorMessage');
        if (err && err.parentNode === container) {
          wrapper.appendChild(err);
        }
      }
      return wrapper;
    };

    const updateBanner = () => {
      try {
        const name = getDocName();
        const existingHost = hostDoc.getElementById('draft-banner-host');
        if (name.includes('DRAFT')) {
          if (!existingHost) {
            const banner = createHostBanner();
            const wrapper = ensureContentWrapper();
            if (wrapper) wrapper.insertBefore(banner, wrapper.firstChild);
            else hostIframe.parentNode.insertBefore(banner, hostIframe);
          }
        } else {
          if (existingHost) existingHost.remove();
        }
      } catch (e) {
        // ignore
      }
    };

    // Initial and reactive updates
    updateBanner();
    let lastName = getDocName();
    const poll = setInterval(() => {
      const current = getDocName();
      if (current !== lastName) {
        lastName = current;
        updateBanner();
      }
    }, 500);

    // Cleanup on iframe unload
    const win = doc.defaultView;
    if (win) {
      win.addEventListener('unload', () => {
        clearInterval(poll);
        // do not remove host banner here; it will be re-evaluated on next load
      }, { once: true });
    }
  })(innerDoc, document, iframe);

  // Intercept any “?path=” links inside the iframe
  innerDoc.addEventListener('click', (event) => {
    const anchor = event.target.closest('a[href^="?path="]');
    if (!anchor) return;

    event.preventDefault();
    const raw = new URLSearchParams(anchor.getAttribute('href').slice(1)).get('path');
    if (!raw) return;
    const parentPath = getCurrentPath.call(window.parent);
    if (raw === parentPath) return;
    window.parent.postMessage({ type: 'navigate', path: raw }, '*');
  });

  /*
  // External links break out to top window
  innerDoc.querySelectorAll('a[href]:not([href^="?path="])')
    .forEach(a => a.target = '_top');
  */
 // Make non-?path= links open in top window, except hash-only anchors
 innerDoc.querySelectorAll('a[href]:not([href^="?path="])').forEach(a => {
   const href = (a.getAttribute('href') || '').trim();
   // Allow in-page hash navigation to work inside the iframe
   if (href.startsWith('#')) return;
   if (!a.hasAttribute('target')) a.target = '_top';
 });

  // Auto‐resize any embeddedDemo iframes
  innerDoc.querySelectorAll('iframe.embeddedDemo').forEach((frame) => {
    const base = frame.src.split('?')[0];
    try {
      frame.contentWindow.location.replace(`${base}?cb=${Date.now()}`);
    } catch {
      frame.src = `${base}?cb=${Date.now()}`;
    }
    frame.scrolling = 'no';

    frame.addEventListener('load', () => {
      const d = getIframeDocument(frame);
      if (!d) return;
      const html = d.documentElement;
      const resize = () => {
        frame.style.height = 'auto';
        frame.style.height = `${computeIframeHeight(d)}px`;
      };
      resize();
      new MutationObserver(resize).observe(html, {
        subtree: true,
        childList: true,
        attributes: true
      });
      setTimeout(resize, 500);
    });
  });

  // Collapsible Sections (opt-in via `section-title` or `data-section-title`)
  (function setupCollapsibleSections(doc) {
    try {
      const selector = 'section[section-title], section[data-section-title]';
      const sections = Array.from(doc.querySelectorAll(selector))
        // avoid reprocessing if we reload/rehook
        .filter(sec => !sec.classList.contains('collapsible-ready'));
      if (sections.length === 0) return;

      // Minimal styles injected once per iframe document
      if (!doc.getElementById('collapsible-section-styles')) {
        const style = doc.createElement('style');
        style.id = 'collapsible-section-styles';
        style.textContent = `
          section.collapsible-ready { margin-top: .5rem; border-top: 1px solid #e0e0e0; padding-top: .25rem; }
          section.collapsible-ready:first-of-type { border-top: 0; margin-top: .25rem; padding-top: 0; }
          /* Depth-based border thickness: thicker top-level, thinner nested */
          section.collapsible-ready[data-depth="1"] { border-top-width: 3px; }
          section.collapsible-ready[data-depth="2"] { border-top-width: 2px; }
          section.collapsible-ready[data-depth="3"] { border-top-width: 1px; }
          section.collapsible-ready[data-depth="4"],
          section.collapsible-ready[data-depth="5"],
          section.collapsible-ready[data-depth="6"] { border-top-width: 1px; }
          /* Depth-based color: darker for higher levels */
          section.collapsible-ready[data-depth="1"] { border-top-color: #777; }
          section.collapsible-ready[data-depth="2"] { border-top-color: #999; }
          section.collapsible-ready[data-depth="3"] { border-top-color: #bfbfbf; }
          section.collapsible-ready[data-depth="4"],
          section.collapsible-ready[data-depth="5"],
          section.collapsible-ready[data-depth="6"] { border-top-color: #e0e0e0; }
          section.collapsible-ready > h1,
          section.collapsible-ready > h2,
          section.collapsible-ready > h3,
          section.collapsible-ready > h4,
          section.collapsible-ready > h5,
          section.collapsible-ready > h6 { margin: 0; }
          .section-toggle { cursor: pointer; background: none; border: none; padding: .15rem 0; font: inherit; color: inherit; display: inline-flex; align-items: center; gap: .4rem; }
          .section-toggle .chev { display: inline-block; width: 1em; }
          .section-body { margin-top: .35rem; }
          /* toolbar for expand/collapse all */
          .section-toolbar { display:flex; gap:.5rem; align-items:center; margin:.25rem 0 .5rem 0; }
          .section-toolbar button { background:none; border:1px solid #ddd; border-radius:4px; padding:.15rem .5rem; cursor:pointer; }
          .section-toolbar button:hover { background:#f7f7f7; }
          /* Optional trailing divider: when enabled, draw a bottom rule under the last section at any level */
          body.show-trailing-dividers section.collapsible-ready:last-of-type {
            border-bottom: 1px solid #e0e0e0;
            padding-bottom: .35rem;
            margin-bottom: .5rem;
          }
        `;
        (doc.head || doc.documentElement).appendChild(style);
      }

      // Parse section targets from parent URL: supports ?section=a&section=b and comma lists
      const getOpenTargets = () => {
        let search = '';
        try {
          search = window.parent?.location?.search || window.location.search || '';
        } catch (_) {
          search = window.location.search || '';
        }
        const params = new URLSearchParams(search);
        const values = [];
        params.forEach((val, key) => {
          if (key.toLowerCase() === 'section') values.push(...String(val).split(','));
        });
        const norm = (s) => String(decodeURIComponent(s || '')).trim().toLowerCase();
        return new Set(values.map(norm).filter(Boolean));
      };
      const openTargets = getOpenTargets();

      // Enable trailing divider if requested by page or parent URL param (?trailing=1)
      try {
        let trailing = false;
        try {
          const search = window.parent?.location?.search || window.location.search || '';
          const params = new URLSearchParams(search);
          const v = (params.get('trailing') || '').toLowerCase();
          trailing = ['1','true','yes','on'].includes(v);
        } catch {}
        if (trailing || doc.body.hasAttribute('data-trailing-dividers')) {
          doc.body.classList.add('show-trailing-dividers');
        }
      } catch {}

      const slugify = (txt) => String(txt || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');

      const isTopLevel = (el) => el.parentElement === doc.body;

      // Build a stable list of top-level collapsibles for default-open logic
      const topLevel = Array.from(doc.body.querySelectorAll(':scope > section[section-title], :scope > section[data-section-title]'))
        .filter(sec => !sec.classList.contains('collapsible-ready'));

      const registry = [];
      const defaultOpenSlugs = new Set(['problem-solved','design-and-strategy']);
      sections.forEach((section, index) => {
        const titleAttr = section.getAttribute('section-title') || section.getAttribute('data-section-title') || '';
        let id = (section.getAttribute('id') || '').trim();
        const slug = slugify(titleAttr);

        // Ensure the section is addressable via a stable ID for deep links
        if (!id) {
          id = slug || `section-${index + 1}`;
          try { section.setAttribute('id', id); } catch {}
        }

        // Compute nested depth (1 = top-level child of body)
        let depth = 1;
        try {
          let parent = section.parentElement;
          while (parent && parent !== doc.body) {
            if (parent.matches && parent.matches('section[section-title], section[data-section-title]')) depth++;
            parent = parent.parentElement;
          }
        } catch {}
        section.setAttribute('data-depth', String(depth));

        // Find or create a heading to host the toggle
        let header = section.querySelector(':scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6');
        if (!header) {
          header = doc.createElement('h2');
          header.textContent = titleAttr || id || 'Section';
          section.insertBefore(header, section.firstChild);
        }

        // Wrap the rest of the content
        const body = doc.createElement('div');
        body.className = 'section-body';
        const children = Array.from(section.childNodes);
        children.forEach((node) => {
          if (node !== header) body.appendChild(node);
        });
        section.appendChild(body);

        // Create a toggle button inside the header
        const btn = doc.createElement('button');
        btn.type = 'button';
        btn.className = 'section-toggle';
        const label = titleAttr || header.textContent || id || 'Section';
        btn.innerHTML = `<span class="chev" aria-hidden="true">▸</span><span class="label"></span>`;
        btn.querySelector('.label').textContent = label;
        header.textContent = '';
        header.appendChild(btn);

        const setExpanded = (expanded) => {
          btn.setAttribute('aria-expanded', String(!!expanded));
          body.hidden = !expanded;
          const chev = btn.querySelector('.chev');
          if (chev) chev.textContent = expanded ? '▾' : '▸';
        };

        const ensureEmbeddedDemoHeights = () => {
          body.querySelectorAll('iframe.embeddedDemo').forEach((frame) => {
            try {
              const d = getIframeDocument(frame);
              if (!d) return;
              // allow layout to settle if just unhidden
              setTimeout(() => {
                try { frame.style.height = 'auto'; } catch {}
                try { frame.style.height = `${computeIframeHeight(d)}px`; } catch {}
              }, 0);
            } catch {}
          });
        };

        btn.addEventListener('click', () => {
          const next = btn.getAttribute('aria-expanded') !== 'true';
          setExpanded(next);
          if (next) ensureEmbeddedDemoHeights();

          // When expanding a section, update the parent URL hash to this section's ID
          if (next) {
            try {
              const p = window.parent;
              if (p && p.history && p.location) {
                const newUrl = `${p.location.pathname}${p.location.search}#${encodeURIComponent(id)}`;
                p.history.replaceState(p.history.state, '', newUrl);
              }
            } catch {}
          }
        });

        // Determine initial state
        let open = false;
        if (openTargets.size > 0) {
          const idKey = id.toLowerCase();
          if (idKey && openTargets.has(idKey)) open = true;
          else if (slug && openTargets.has(slug)) open = true;
        } else {
          // Default: open key intro sections if present; otherwise open first top-level only
          const idKey = id.toLowerCase();
          const isPreferred = (defaultOpenSlugs.has(slug) || (idKey && defaultOpenSlugs.has(idKey)));
          if (isPreferred) {
            open = true;
          } else if (topLevel.length > 0) {
            open = (isTopLevel(section) && section === topLevel[0]);
          } else {
            open = (index === 0); // fallback
          }
        }
        setExpanded(open);
        if (open) ensureEmbeddedDemoHeights();

        section.classList.add('collapsible-ready');
        registry.push({ section, btn, body, setExpanded });
      });

      // Insert Expand/Collapse All toolbar near the page title
      if (registry.length > 0 && !doc.getElementById('section-toolbar')) {
        const toolbar = doc.createElement('div');
        toolbar.id = 'section-toolbar';
        toolbar.className = 'section-toolbar';
        const expandBtn = doc.createElement('button');
        expandBtn.type = 'button';
        expandBtn.textContent = 'Expand All';
        expandBtn.addEventListener('click', () => {
          registry.forEach(({ setExpanded }) => setExpanded(true));
          // resize any newly visible embedded demos
          registry.forEach(({ body }) => {
            body.querySelectorAll('iframe.embeddedDemo').forEach((frame) => {
              try {
                const d = getIframeDocument(frame);
                if (d) frame.style.height = `${computeIframeHeight(d)}px`;
              } catch {}
            });
          });
        });
        const collapseBtn = doc.createElement('button');
        collapseBtn.type = 'button';
        collapseBtn.textContent = 'Collapse All';
        collapseBtn.addEventListener('click', () => {
          registry.forEach(({ setExpanded }) => setExpanded(false));
        });
        toolbar.appendChild(expandBtn);
        toolbar.appendChild(collapseBtn);

        const title = doc.querySelector('body > h1');
        const firstSection = registry[0]?.section;
        if (title && title.parentNode) {
          title.parentNode.insertBefore(toolbar, title.nextSibling);
        } else if (firstSection && firstSection.parentNode) {
          firstSection.parentNode.insertBefore(toolbar, firstSection);
        } else {
          doc.body.insertBefore(toolbar, doc.body.firstChild);
        }
      }
    } catch (e) {
      // Swallow errors to avoid affecting live content loading
      console.error('Collapsible setup error:', e);
    }
  })(innerDoc);

  // Support deep-linking: scroll to element matching parent hash
  (function handleHashScroll(doc) {
    const scrollToId = (id) => {
      if (!id) return;
      try {
        const target = doc.getElementById(id) || doc.querySelector(`[name="${CSS.escape(id)}"]`);
        if (!target) return;
        // Expand any collapsed ancestor sections to ensure visibility
        let node = target;
        while (node && node !== doc.body) {
          if (node.classList && node.classList.contains('collapsible-ready')) {
            const btn = node.querySelector(':scope > h1 .section-toggle, :scope > h2 .section-toggle, :scope > h3 .section-toggle, :scope > h4 .section-toggle, :scope > h5 .section-toggle, :scope > h6 .section-toggle');
            const body = node.querySelector(':scope > .section-body');
            if (btn) btn.setAttribute('aria-expanded', 'true');
            if (body) body.hidden = false;
          }
          node = node.parentElement;
        }
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch {}
    };

    // Initial pass using parent's hash (preferred), else iframe's own hash
    let hash = '';
    try { hash = window.parent?.location?.hash || window.location.hash || ''; }
    catch { hash = window.location.hash || ''; }
    if (hash && hash.startsWith('#')) scrollToId(hash.slice(1));

    // Listen for parent hash changes while this doc is active
    try {
      const onHash = () => {
        const h = window.parent.location.hash;
        if (h && h.startsWith('#')) scrollToId(h.slice(1));
      };
      window.parent.addEventListener('hashchange', onHash);
      // Clean up when iframe unloads
      (doc.defaultView || window).addEventListener('unload', () => {
        try { window.parent.removeEventListener('hashchange', onHash); } catch {}
      }, { once: true });
    } catch {}
  })(innerDoc);
}

// ─── Build Sidebar Menu ───────────────────────────────────────────────────────
const buildMenu = (chapters) => {
  const menuContainer = document.querySelector('#menu');
  menuContainer.innerHTML = `
    <div class="menu-controls">
      <button id="expandAll" class="link-style">Expand All</button>
      <button id="collapseAll" class="link-style">Collapse All</button>
    </div>
    <ul> </ul>
  `;
  const menuRoot = menuContainer.querySelector('ul');

  const buildList = (items, container, pathPrefix, level = 1) => {
   const orderList = (() => {
    if (pathPrefix === 'Techniques/Decrease-and-Conquer/') return DECREASE_AND_CONQUER_ORDER;
    if (pathPrefix === 'Techniques/') return TECHNIQUES_ORDER;
    if (pathPrefix === 'Problems/') return PROBLEMS_ORDER;
    if (pathPrefix === 'Algorithms/') return ALGORITHMS_ORDER;
    if (pathPrefix === 'Demos/') return DEMOS_ORDER;
    return [];
  })();
    items
      .sort((a, b) => {
        const indexA = orderList.indexOf(getKey(a));
        const indexB = orderList.indexOf(getKey(b));
        return (indexA === -1 ? 9999 : indexA) - (indexB === -1 ? 9999 : indexB);
      })
      .forEach((item) => {
        const li = document.createElement('li');
        if (typeof item === 'string') {
          const raw = item.replace(/\.html$/, '');
          const fullPath = (pathPrefix.includes('More/DRAFTS') && raw.includes('/'))
            ? raw // already a full path
            : pathPrefix + raw;
          const a = document.createElement('a');
          a.textContent = raw.split('/').pop().replace(/Demo$/, '').trim();
          a.href = `?path=${encodeURIComponent(fullPath)}`;
          a.style.fontSize = `${1 - (level - 1) * 0.1}em`;
		  
		 
		a.addEventListener('click', (e) => {
		  if (aKeyDown) {
			e.preventDefault();
			e.stopImmediatePropagation();

			const menu = document.querySelector('#menu');
			menu.classList.add('noselect');
			const sel = window.getSelection?.();
			if (sel && !sel.isCollapsed) sel.removeAllRanges();
			requestAnimationFrame(() => {
			  menu.classList.remove('noselect');
			});

			const url = new URL(window.location.href);
			url.search = `?path=${encodeURIComponent(fullPath)}`;
			const html = `<li><a href="${url.href}">DAIA: ${a.textContent}</a></li>`;

			navigator.clipboard.writeText(html)
			  .then(() => {
				a.title = 'Copied!';
				setTimeout(() => (a.title = ''), 1000);
			  })
			  .catch(() => alert('Failed to copy link'));
		  }
		});
          li.appendChild(a);
        } else {
          Object.entries(item).forEach(([dir, sub]) => {
            const span = document.createElement('span');
            span.textContent = dir;
            span.style.fontSize = `${1 - (level - 1) * 0.1}em`;
            /*span.onclick = () => li.classList.toggle('open');*/
			span.onclick = (e) => {
				// Only toggle submenu if not Alt+Shift+Click
				if (e.altKey && e.shiftKey) return;
				li.classList.toggle('open');
				};
            li.appendChild(span);

            const ul = document.createElement('ul');
            buildList(sub, ul, `${pathPrefix}${dir}/`, orderList, level + 1);
            li.appendChild(ul);
          });
        }
        container.appendChild(li);
      });
  };

  TOP_LEVEL_ORDER.forEach((sectionName) => {
    const contents = chapters[sectionName];
    if (!contents) return;

    const li = document.createElement('li');
    const span = document.createElement('span');
    span.textContent = sectionName;
    span.style.fontSize = '1.1em';
    /*span.onclick = () => li.classList.toggle('open');*/
	span.onclick = (e) => {
		  // Prevent toggling open if Alt+Shift was used (used for copy)
		  if (e.altKey && e.shiftKey) return;
		  li.classList.toggle('open');
		};

    li.appendChild(span);

    const ul = document.createElement('ul');
    
    buildList(contents, ul, `${sectionName}/`);
    li.appendChild(ul);
    menuRoot.appendChild(li);
  });

};

// ─── Load Content via Fetch + Replace‐into‐iframe ────────────────────────────
async function loadContent(relativePath) {
  const iframe = document.getElementById('content');
  const err = document.getElementById('errorMessage');
  const url = `Content/${relativePath}`;

  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await res.text(); // just to confirm it exists

    err.style.display = 'none';
    iframe.style.display = 'block';

    // Use src assignment with cache-bust for stable navigation in iframe
    iframe.src = `${url}?_=${Date.now()}`;

    iframe.onload = () => {
      hookIframeContent(iframe);

      let firstResize = true;
      const resizeIframe = () => {
        const prevY = window.pageYOffset;
        iframe.style.height = 'auto';
        const d = getIframeDocument(iframe);
        if (!d) return;
        const finalHeight = computeIframeHeight(d);
        iframe.style.height = `${finalHeight}px`;

        if (firstResize && pendingScrollRestore !== null) {
          window.scrollTo(0, parseInt(pendingScrollRestore, 10));
          pendingScrollRestore = null;
          firstResize = false;
        } else {
          window.scrollTo(0, prevY);
        }
      };

      // If the frame loaded into an empty document, re-navigate once defensively
      try {
        const dtest = getIframeDocument(iframe);
        const isEmpty = !dtest || !dtest.body || dtest.body.childElementCount === 0;
        if (isEmpty) {
          // reassign src once
          iframe.src = `${url}?__retry__=${Date.now()}`;
          return; // wait for next onload
        }
      } catch {}

      resizeIframe();
      const d = getIframeDocument(iframe);
      if (d) {
        new MutationObserver(resizeIframe).observe(d.documentElement, {
          subtree: true,
          childList: true,
          attributes: true
        });
      }
      window.addEventListener('resize', resizeIframe);

      // After content is ready, if parent URL has a hash, scroll to it
      try {
        const h = window.location.hash;
        if (h && h.startsWith('#')) {
          const d2 = getIframeDocument(iframe);
          const id = h.slice(1);
          const el = d2 && (d2.getElementById(id) || d2.querySelector(`[name="${CSS.escape(id)}"]`));
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } catch {}
    };
  } catch (e) {
    iframe.style.display = 'none';
    const rawPath = getCurrentPath();
    err.innerHTML = `
      <p>The page you are trying to load cannot be found.<br>
      It is possible it is still being created.<br>
      Please check back later.</p>
      <p><strong>Page path:</strong> ${rawPath}</p>
    `;
    err.style.display = 'block';
  }
}

// ─── Scroll Position Preservation ────────────────────────────────────────────
window.addEventListener('beforeunload', () => {
  sessionStorage.setItem('scrollPos', window.pageYOffset);
});
window.addEventListener('load', () => {
  const saved = sessionStorage.getItem('scrollPos');
  if (saved !== null) {
    pendingScrollRestore = saved;
    sessionStorage.removeItem('scrollPos');
  }
});

// ─── App Initialization ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  fetch('scripts/chapters.json')
    .then((res) => res.json())
    .then((chaptersData) => {
      buildMenu(chaptersData);

      document
        .querySelector('#expandAll')
        .onclick = () => document.querySelectorAll('#menu li').forEach((li) => li.classList.add('open'));
      document
        .querySelector('#collapseAll')
        .onclick = () => document.querySelectorAll('#menu li').forEach((li) => li.classList.remove('open'));

      loadFromURLParams();
    })
    .catch(console.error);


  document.addEventListener('click', (event) => {
	  
	console.log("Click!");
    if (event.target.closest('iframe')) return;
    const anchor = event.target.closest('a[href^="?path="]');
    if (!anchor) return;
    if (aKeyDown) return;
    event.preventDefault();
    const rawPath = new URLSearchParams(anchor.getAttribute('href').slice(1)).get('path');
    if (!rawPath) return;
    navigateTo(rawPath);
  });

  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (msg?.type === 'demo-fullscreen') {
      const frame = event.source.frameElement;
      frame?.requestFullscreen().catch(console.error);
    }
  });
});

// ─── Listen for “navigate” messages from inside iframes ───────────────────────
window.addEventListener('message', (event) => {
  const msg = event.data;
  if (msg?.type === 'navigate' && msg.path) {
    navigateTo(msg.path);
  }
});

// ─── Handle Back/Forward buttons ─────────────────────────────────────────────
window.removeEventListener('popstate', loadFromURLParams);
window.addEventListener('popstate', (event) => {
  const state = event.state || {};
  pendingScrollRestore = typeof state.scrollY === 'number' ? state.scrollY : 0;
  const rawPath = state.path || 'Home/About';
  highlightActiveLink(rawPath);
  loadContent(`${normalizePath(rawPath)}.html`);
});
