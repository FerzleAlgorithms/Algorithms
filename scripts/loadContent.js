// File: scripts/loadContent.js

history.scrollRestoration = 'manual';

// ─── Ordering Constants (unchanged) ───────────────────────────────────────────
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
  'Problem List',
  'Foundational',
  'Optimization',
  'Geometry',
  'Graphs',
  'Other'
];
const ALGORITHMS_ORDER = [
  'Brute Force',
  'Exhaustive Search',
  'Divide-and-Conquer',
  'Decrease-and-Conquer',
  'Transform-and-Conquer',
  'Greedy',
  'Dynamic Programming',
  'Space-Time Tradeoff',
  'Backtracking'
];
// For "Demos", we just mirror the same order as the algorithm names:
const DEMOS_ORDER = [...ALGORITHMS_ORDER];

// ─── Utility Functions (unchanged) ──────────────────────────────────────────
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

// ─── Navigation / Scroll‐State / Content Loading ─────────────────────────────
let pendingScrollRestore = null;

const navigateTo = (rawPath) => {
  const currentPath = getCurrentPath();
  if (rawPath === currentPath) return;

  // ─── 1) Save the *old* scroll position into the current history entry:
  const oldScrollY = window.pageYOffset;
  history.replaceState(
    { path: currentPath, scrollY: oldScrollY },
    '',
    `?path=${ normalizePath(currentPath) }`
  );

  // ─── 2) Push the new entry with scrollY = 0
  const safe = normalizePath(rawPath);
  history.pushState(
    { path: rawPath, scrollY: 0 },
    '',
    `?path=${safe}`
  );

  // ─── 3) Immediately jump to top and load the new content
  window.scrollTo(0, 0);
  loadContent(`${safe}.html`);
};

const loadFromURLParams = () => {
  // Used on initial page load (or if someone manually types in ?path=…).
  const rawPath = new URLSearchParams(window.location.search).get('path') || 'home';
  loadContent(`${normalizePath(rawPath)}.html`);
};

// ─── iframe Hooking & Resizing ───────────────────────────────────────────────
function hookIframeContent(iframe) {
  const innerDoc = iframe.contentDocument;
  if (!innerDoc) return;

  // 2) Prevent duplicate injection: check if we've already added the glossary scripts
  //    (You can guard by checking for an existing element with a known “id” or “data-” attribute.)
  if (innerDoc.getElementById("glossary-data-script")) {
    // Already injected; skip
    return;
  }

  // 3) Get the <head> of the iframe document
  const head = innerDoc.head || innerDoc.getElementsByTagName("head")[0];
  if (!head) return;

  // 4) (Optional) Inject your main CSS if the content pages do not already link to it.
  //    If every content page already has:
  //        <link rel="stylesheet" href="/Algorithms/css/style.css" />
  //    you can skip this step. Otherwise, uncomment the lines below:
  //
  // const link = doc.createElement("link");
  // link.rel = "stylesheet";
  // link.href = "/Algorithms/css/style.css"; // adjust the path as needed
  // head.appendChild(link);

  // 5) Inject glossary-data.json
  const scriptData = innerDoc.createElement("script");
  scriptData.type = "module";
  scriptData.id = "glossary-data-script";
  // remove these lines:
  //   scriptData.src = "/Algorithms/scripts/glossary-data.json";
  //   head.appendChild(scriptData);
  
  fetch("/Algorithms/scripts/glossary-data.json?cb=" + Date.now(), {
    cache: "no-store",
  })
    .then(res => {
      if (!res.ok) throw new Error("Could not load glossary JSON");
      return res.json();
    })
    .then(data => {
      window.GLOSSARY = data;      // make it global if other scripts expect it
      // if you're using the updated tooltip code, it already fetches & runs itself
    })
    .catch(err => console.error(err));


  // 6) Inject glossary-tooltips.js
  const scriptTips = innerDoc.createElement("script");
  scriptTips.type = "module";
  scriptTips.id = "glossary-tooltips-script";
  scriptTips.src = "/Algorithms/scripts/glossary-tooltips.js";
  head.appendChild(scriptTips);
  
  // Intercept any “?path=” link clicks inside the iframe:
  innerDoc.addEventListener('click', (event) => {
    const anchor = event.target.closest('a[href^=\"?path=\"]');
    if (!anchor) return;
    event.preventDefault();
    const raw = new URLSearchParams(anchor.getAttribute('href').slice(1)).get('path');
    if (!raw) return;

    // If it’s already the current path in the parent, do nothing
    const parentPath = getCurrentPath.call(window.parent);
    if (raw === parentPath) return;

    // Ask the parent to navigate (this pushes a new top‐level history entry)
    window.parent.postMessage({ type: 'navigate', path: raw }, '*');
  });

  // Any external link (not “?path=”) should break out to the top window:
  innerDoc.querySelectorAll('a[href]:not([href^=\"?path=\"])').forEach((a) => {
    a.target = '_top';
  });

  // Resize any embeddedDemo iframe inside this iframe—but use replace() instead of src=...
  innerDoc.querySelectorAll('iframe.embeddedDemo').forEach((frame) => {
    const base = frame.src.split('?')[0];
    // ─── REPLACE the location instead of assigning src, so we never push a new entry inside this iframe: ───
    try {
      frame.contentWindow.location.replace(`${base}?cb=${Date.now()}`); // ← avoids extra iframe history
    } catch (crossOriginErr) {
      // If cross‐origin, fall back to plain src assignment (it WILL push a history entry,
      // but there’s no other choice if the iframe is not same‐origin).
      frame.src = `${base}?cb=${Date.now()}`;
    }
    frame.scrolling = 'no';

    frame.addEventListener('load', () => {
      const d = frame.contentDocument || frame.contentWindow.document;
      const resizeFn = () => {
        frame.style.height = 'auto';
        const h = Math.max(d.documentElement.scrollHeight, d.body.scrollHeight);
        frame.style.height = `${h}px`;
      };
      resizeFn();
      new MutationObserver(resizeFn).observe(d.documentElement, {
        subtree: true,
        childList: true,
        attributes: true
      });
    });
  });
}

// ─── Build Sidebar Menu (unchanged) ─────────────────────────────────────────
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

  // Recursive helper to build a nested <ul> structure
  const buildList = (items, container, pathPrefix, orderList = [], level = 1) => {
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
          const a = document.createElement('a');
          a.textContent = raw.replace(/Demo$/, '').trim();
          a.href = `?path=${encodeURIComponent(pathPrefix + raw)}`;
          // Slightly decrease font size with each deeper level
          a.style.fontSize = `${1 - (level - 1) * 0.1}em`;
          li.appendChild(a);
        } else {
          Object.entries(item).forEach(([dir, sub]) => {
            const span = document.createElement('span');
            span.textContent = dir;
            span.style.fontSize = `${1 - (level - 1) * 0.1}em`;
            span.onclick = () => li.classList.toggle('open');
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
    span.onclick = () => li.classList.toggle('open');
    li.appendChild(span);

    const ul = document.createElement('ul');
    // Choose an ordering list if this section is Problems, Algorithms, or Demos
    const orderList = {
      Problems: PROBLEMS_ORDER,
      Algorithms: ALGORITHMS_ORDER,
      Demos: DEMOS_ORDER
    }[sectionName] || [];

    buildList(contents, ul, `${sectionName}/`, orderList);
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
    // 1) Check the file exists (no‐cache):
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await res.text(); // we only need to be sure it exists

    // 2) Hide any previous error:
    err.style.display = 'none';
    iframe.style.display = 'block';

    // 3) Replace the iframe’s location instead of using `.src = …`:
    try {
      iframe.contentWindow.location.replace(url); // ← never push a new entry inside the content iframe
    } catch (crossOriginErr) {
      // If that fails (very rare, since Content/ is same‐origin), fall back to `.src`
      iframe.src = `${url}?_=${Date.now()}`;
    }

    // 4) Once the new document is loaded in the iframe, hook it and restore scroll if needed:
    iframe.onload = () => {
      hookIframeContent(iframe);
      let firstResize = true;

      const resizeIframe = () => {
        const prevY = window.pageYOffset;
        iframe.style.height = 'auto';
        const d = iframe.contentDocument || iframe.contentWindow.document;
        const h = Math.max(d.documentElement.scrollHeight, d.body.scrollHeight);
        iframe.style.height = `${50 + h}px`;

        if (firstResize && pendingScrollRestore !== null) {
          window.scrollTo(0, parseInt(pendingScrollRestore, 10));
          pendingScrollRestore = null;
          firstResize = false;
        } else {
          window.scrollTo(0, prevY);
        }
      };

      resizeIframe();
      new MutationObserver(resizeIframe).observe(iframe.contentDocument.documentElement, {
        subtree: true,
        childList: true,
        attributes: true
      });
      window.addEventListener('resize', resizeIframe);
    };
  } catch (e) {
    //console.error(e);
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

// ─── Scroll Position Preservation (unchanged) ───────────────────────────────
window.addEventListener('beforeunload', () => {
  // This ensures that if someone does a *hard* reload (F5) or navigates away and comes back,
  // we still have a fallback scroll position. But popState will handle virtual‐page scroll.
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
  // Fetch the JSON that describes all chapters & their files
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

      // On initial page load, read ?path=… and load content
      loadFromURLParams();
    })
    .catch(console.error);

  // Intercept any “?path=” link in the parent document (outside iframes):
  document.addEventListener('click', (event) => {
    if (event.target.closest('iframe')) return;
    const anchor = event.target.closest('a[href^=\"?path=\"]');
    if (!anchor) return;

    event.preventDefault();
    const rawPath = new URLSearchParams(anchor.getAttribute('href').slice(1)).get('path');
    if (!rawPath) return;
    navigateTo(rawPath);
  });

  // Listen for fullscreen requests from demos:
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

// ─── Handle Back/Forward buttons on the top level: replace popstate handler ──
window.removeEventListener('popstate', loadFromURLParams); // in case it was added
window.addEventListener('popstate', (event) => {
  const state = event.state || {};
  // 1) Read scrollY from state (if present), otherwise default to 0
  pendingScrollRestore = typeof state.scrollY === 'number' ? state.scrollY : 0;

  // 2) Navigate to the saved path
  const rawPath = state.path || 'home';
  loadContent(`${ normalizePath(rawPath) }.html`);
});
