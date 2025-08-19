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
  'home';

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
  const rawPath = new URLSearchParams(window.location.search).get('path') || 'home';
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

  // Insert a visible DRAFT banner when the iframe document name (filename) includes "DRAFT"
  (function manageDraftBanner(doc) {
    if (!doc || !doc.body) return;

    const createBanner = () => {
      const b = doc.createElement('div');
      b.id = 'draft-banner';
      b.textContent = 'DRAFT';
      b.style.cssText = [
        'color:#b00000',
        'font-size:48px',
        'font-weight:700',
        'text-align:center',
        'padding:8px 0',
        'background:rgba(255,0,0,0.03)',
        'border-bottom:3px solid rgba(176,0,0,0.12)',
        'position:relative',
        'z-index:9999',
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

    const updateBanner = () => {
      try {
        const name = getDocName();
        const existing = doc.getElementById('draft-banner');
        if (name.includes('DRAFT')) {
          if (!existing) doc.body.insertBefore(createBanner(), doc.body.firstChild);
        } else {
          if (existing) existing.remove();
        }
      } catch (e) {
        // ignore cross-origin or other errors
      }
    };

    // Initial check
    updateBanner();

    // Poll for changes to the document name (handles in-page navigation)
    let lastName = getDocName();
    const poll = setInterval(() => {
      const current = getDocName();
      if (current !== lastName) {
        lastName = current;
        updateBanner();
      }
    }, 500);

    // Clear poll and banner on iframe unload
    const win = doc.defaultView;
    if (win) {
      win.addEventListener('unload', () => {
        clearInterval(poll);
        const existing = doc.getElementById('draft-banner');
        if (existing) existing.remove();
      }, { once: true });
    }
  })(innerDoc);

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
 innerDoc.querySelectorAll('a[href]:not([href^="?path="])').forEach(a => {
   // only set a target if none was explicitly given
   if (!a.hasAttribute('target')) {
     a.target = '_top';
   }
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
}

// ─── Build Sidebar Menu ───────────────────────────────────────────────────────
const buildMenu = (chapters) => {
  const menuContainer = document.querySelector('#menu');
  menuContainer.innerHTML = `
    <div class="menu-controls">
      <button id="expandAll" class="link-style">Expand All</button>
      <button id="collapseAll" class="link-style">Collapse All</button>
    </div>
    <ul><li><a href="?path=home">Home</a></li></ul>
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

    try {
      iframe.contentWindow.location.replace(url);
    } catch {
      iframe.src = `${url}?_=${Date.now()}`;
    }

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
  const rawPath = state.path || 'home';
  highlightActiveLink(rawPath);
  loadContent(`${normalizePath(rawPath)}.html`);
});

