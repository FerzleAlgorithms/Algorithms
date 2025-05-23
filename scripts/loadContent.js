// scripts/loadContent.js

// ============================================
// Helpers
// ============================================

/**
 * Normalize a slash-delimited path by decoding and re-encoding each segment.
 * @param {string} path
 * @returns {string}
 */
function normalizePath(path) {
  return path
    .split("/")
    .map(function(segment) {
      return encodeURIComponent(decodeURIComponent(segment));
    })
    .join("/");
}

/**
 * Hook an <object> element so that its internal links and embedded demos behave correctly.
 * - Intercepts "?path=" links for internal navigation
 * - Opens other links in the top frame
 * - Busts cache and resizes any <iframe.embeddedDemo> elements
 * @param {HTMLObjectElement} obj
 */
function hookIframeContent(obj) {
  var innerDoc = obj.contentDocument;
  if (!innerDoc) return;

  // a) Internal navigation
  innerDoc.addEventListener("click", function onInnerClick(event) {
    var anchor = event.target.closest('a[href]');
    if (!anchor) return;
    var href = anchor.getAttribute("href");
    if (!href.startsWith("?path=")) return;

    event.preventDefault();
    var raw = new URLSearchParams(href.slice(1)).get("path");
    if (!raw) return;
    var safe = normalizePath(raw);
    parent.loadContent(safe + ".html");
    parent.history.pushState({}, "", "?path=" + raw);
  });

  // b) External links open at top
  innerDoc.querySelectorAll('a[href]:not([href^="?path="])')
    .forEach(function(a) { a.target = "_top"; });

  // c) Embedded demos: cache-bust & auto-resize
  innerDoc.querySelectorAll('iframe.embeddedDemo')
    .forEach(function(frame) {
      var base = frame.src.split('?')[0];
      frame.src = base + '?cb=' + Date.now();
      frame.scrolling = 'no';
      frame.addEventListener('load', function() {
        var d = frame.contentDocument || frame.contentWindow.document;
        frame.style.height = d.documentElement.scrollHeight + 'px';
      });
    });
}

// ============================================
// 1) Build the sidebar menu from chapters.json
// ============================================

/**
 * Builds the nested sidebar menu.
 * @param {Object} chapters
 */
function buildMenu(chapters) {
  var menu = document.querySelector("#menu ul");
  menu.innerHTML = "<li><a href='?path=home'>Home</a></li>";

  function buildList(items, container, pathPrefix, isDemo) {
    items.forEach(function(item) {
      var li = document.createElement('li');

      if (typeof item === 'string') {
        // Leaf page
        var raw = item.replace(/\.html$/, '');
        var name = raw.replace(/^\d+_/, '').replace(/_/g, ' ');
        var a = document.createElement('a');
        a.textContent = isDemo ? name.replace(/Demo/g, '').trim() : name;
        a.href = '?path=' + encodeURIComponent(pathPrefix + raw);
        li.appendChild(a);
      } else {
        // Folder
        Object.entries(item).forEach(function([dir, sub]) {
          var span = document.createElement('span');
          span.textContent = dir.replace(/^\d+_/, '').replace(/_/g, ' ');
          span.onclick = function() { li.classList.toggle('open'); };
          li.appendChild(span);

          var ul = document.createElement('ul');
          buildList(sub, ul, pathPrefix + dir + '/', isDemo);
          li.appendChild(ul);
        });
      }
      container.appendChild(li);
    });
  }

  Object.entries(chapters).forEach(function([chap, contents]) {
    var li = document.createElement('li');
    var span = document.createElement('span');
    span.textContent = chap.replace(/^\d+_/, '').replace(/_/g, ' ');
    span.onclick = function() { li.classList.toggle('open'); };
    li.appendChild(span);

    var ul = document.createElement('ul');
    buildList(contents, ul, chap + '/', chap === 'Demos');
    li.appendChild(ul);
    menu.appendChild(li);
  });
}

// ============================================
// 2) Load and display HTML content
// ============================================

/**
 * Loads a page into the main <object> element.
 * @param {string} relativePath
 */
async function loadContent(relativePath) {
  var obj = document.getElementById('content');
  var err = document.getElementById('errorMessage');
  var url = 'Content/' + relativePath;

  try {
    var res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    await res.text(); // confirm success

    err.style.display = 'none';
    obj.style.display = 'block';
    obj.src = url + '?_=' + Date.now();
    obj.onload = function() { hookIframeContent(obj); };

  } catch (e) {
    console.error('loadContent error:', e);
    obj.style.display = 'none';
    err.textContent = 'Error loading "' + relativePath + '": ' + e.message;
    err.style.display = 'block';
    throw e;
  }
}
// ============================================
// 3) Routing & Initialization
// ============================================
/**
 * Reads the '?path=' parameter from the URL and loads the corresponding content.
 * If no '?path' is present, defaults to 'credits.html'.
 */
function loadFromURLParams() {
  // Grab the 'path' parameter (e.g., '?path=Chapter1/Intro').
  var pathParam = new URLSearchParams(window.location.search).get('path') || 'credits';
  // Normalize each path segment to ensure consistent encoding.
  var normalizedPath = normalizePath(pathParam);
  // Load the HTML page (appending '.html').
  loadContent(normalizedPath + '.html');
}

// Listen for browser history navigation (back/forward buttons)
window.addEventListener('popstate', loadFromURLParams);

// Wait until the DOM is ready before binding events and initializing
document.addEventListener('DOMContentLoaded', function initApp() {
  // 3a) Fetch and build the sidebar menu
  fetch('scripts/chapters.json')
    .then(function(response) {
      return response.json();
    })
    .then(function(chaptersData) {
      // Build the menu using the JSON definition
      buildMenu(chaptersData);
      // After menu is ready, load the initial content
      loadFromURLParams();
    })
    .catch(function(fetchError) {
      console.error('Error loading chapters.json:', fetchError);
    });

  // 3b) Delegate in-app navigation clicks
  document.addEventListener('click', function onNavClick(event) {
    // Find nearest <a> whose href starts with '?path='
    var anchor = event.target.closest('a[href^="?path="]');
    if (!anchor) return;  // ignore other clicks
    event.preventDefault();

    // Extract the raw path value from the link
    var rawPath = new URLSearchParams(anchor.getAttribute('href').slice(1)).get('path');
    if (!rawPath) return;

    // Load the new content and push a history entry
    var safe = normalizePath(rawPath);
    loadContent(safe + '.html');
    history.pushState({}, '', '?path=' + rawPath);
  });

  // 3c) Handle postMessage events from embedded demos
  window.addEventListener('message', function onDemoMessage(event) {
    var msg = event.data;
    // Fullscreen request from demo iframe
    if (msg && msg.type === 'demo-fullscreen') {
      var frame = event.source.frameElement;
      if (frame && typeof frame.requestFullscreen === 'function') {
        frame.requestFullscreen().catch(console.error);
      }
    }
    // Height adjustment request from demo iframe
    if (msg && msg.type === 'demo-height') {
      var demoFrame = event.source.frameElement;
      if (demoFrame && demoFrame.classList.contains('embeddedDemo')) {
        demoFrame.style.height = msg.height + 'px';
      }
    }
  });

  // 3d) Auto-resize the main content iframe to fit its document height
  var mainObj = document.getElementById('content');
  // Disable internal scrollbars
  mainObj.scrolling = 'no';
  // On each load, adjust height to match inner document
  mainObj.addEventListener('load', function onMainLoad() {
    var doc = mainObj.contentDocument || mainObj.contentWindow.document;
    if (doc && doc.documentElement) {
      mainObj.style.height = doc.documentElement.scrollHeight + 'px';
    }
  });
});