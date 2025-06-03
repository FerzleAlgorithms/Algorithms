// File: scripts/loadContent.js

// --- Section: Top-level Ordering Constants ---
const TOP_LEVEL_ORDER = [
  "Home", "Problems", "Data Structures", "Techniques", "Algorithms", "Demos", "More"
];

const PROBLEMS_ORDER = [
  "Problem List", "Foundational", "Optimization", "Geometry", "Graphs", "Other"
];

const ALGORITHMS_ORDER = [
  "Brute Force", "Exhaustive Search", "Divide-and-Conquer", "Decrease-and-Conquer",
  "Transform-and-Conquer", "Greedy", "Dynamic Programming", "Space-Time Tradeoff", "Backtracking"
];

const DEMOS_ORDER = [...ALGORITHMS_ORDER];

// --- Section: Utility Functions ---
function normalizePath(path) {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
    .join("/");
}

// --- Section: Iframe Hooking and Resizing ---
function hookIframeContent(obj) {
  const innerDoc = obj.contentDocument;
  if (!innerDoc) return;

  innerDoc.addEventListener("click", function onInnerClick(event) {
    const anchor = event.target.closest('a[href]');
    if (!anchor) return;

    const href = anchor.getAttribute("href");
    if (!href.startsWith("?path=")) return;

    event.preventDefault();
    const raw = new URLSearchParams(href.slice(1)).get("path");
    if (!raw) return;

    const parentCurrent = (history.state && history.state.path) ||
      new URLSearchParams(window.location.search).get("path") || "home";

    if (raw === parentCurrent) return;

    const safe = normalizePath(raw);
    parent.loadContent(safe + ".html");
    parent.history.pushState({ path: raw }, "", "?path=" + safe);
  });

  innerDoc.querySelectorAll('a[href]:not([href^="?path="])').forEach((a) => {
    a.target = "_top";
  });

  innerDoc.querySelectorAll("iframe.embeddedDemo").forEach((frame) => {
    const base = frame.src.split("?")[0];
    frame.src = base + "?cb=" + Date.now();
    frame.scrolling = "no";

    frame.addEventListener("load", () => {
      const d = frame.contentDocument || frame.contentWindow.document;

      function resize() {
        frame.style.height = "auto";
        const h = Math.max(d.documentElement.scrollHeight, d.body.scrollHeight);
        frame.style.height = h + "px";
      }

      resize();
      new MutationObserver(resize).observe(d.documentElement, {
        childList: true,
        subtree: true,
        attributes: true
      });
    });
  });
}

// --- Section: Menu Building ---
function buildMenu(chapters) {
  const menuContainer = document.querySelector("#menu");
  menuContainer.innerHTML = `
    <div class="menu-controls">
    <button id="expandAll" class="link-style">Expand All</button>
    <button id="collapseAll" class="link-style">Collapse All</button>
    </div>
    <ul><li><a href='?path=home'>Home</a></li></ul>
  `;

  const menu = menuContainer.querySelector("ul");

  function buildList(items, container, pathPrefix, orderList = [], level = 1) {
    const getKey = (entry) =>
      typeof entry === "string" ? entry.replace(/\.html$/, "") : Object.keys(entry)[0];

    items.sort((a, b) => {
      const indexA = orderList.indexOf(getKey(a));
      const indexB = orderList.indexOf(getKey(b));
      return (indexA === -1 ? 9999 : indexA) - (indexB === -1 ? 9999 : indexB);
    });

    items.forEach((item) => {
      const li = document.createElement("li");

      if (typeof item === "string") {
        const raw = item.replace(/\.html$/, "");
        const a = document.createElement("a");
        a.textContent = raw.replace(/Demo$/, "").trim();
        a.href = "?path=" + encodeURIComponent(pathPrefix + raw);
        a.style.fontSize = `${1 - (level - 1) * 0.1}em`;
        li.appendChild(a);
      } else {
        Object.entries(item).forEach(([dir, sub]) => {
          const span = document.createElement("span");
          span.textContent = dir;
          span.style.fontSize = `${1 - (level - 1) * 0.1}em`;
          span.onclick = () => li.classList.toggle("open");
          li.appendChild(span);

          const ul = document.createElement("ul");
          buildList(sub, ul, pathPrefix + dir + "/", orderList, level + 1);
          li.appendChild(ul);
        });
      }

      container.appendChild(li);
    });
  }

  TOP_LEVEL_ORDER.forEach((plainName) => {
    const rawKey = Object.keys(chapters).find((k) => k === plainName);
    if (!rawKey) return;

    const contents = chapters[rawKey];
    const li = document.createElement("li");

    const span = document.createElement("span");
    span.textContent = plainName;
    span.style.fontSize = "1.1em";
    span.onclick = () => li.classList.toggle("open");
    li.appendChild(span);

    const ul = document.createElement("ul");
    const orderList = {
      Problems: PROBLEMS_ORDER,
      Algorithms: ALGORITHMS_ORDER,
      Demos: DEMOS_ORDER
    }[plainName] || [];

    buildList(contents, ul, rawKey + "/", orderList);
    li.appendChild(ul);
    menu.appendChild(li);
  });
}

// --- Section: Load Content via Ajax ---
async function loadContent(relativePath) {
  const obj = document.getElementById("content");
  const err = document.getElementById("errorMessage");
  const url = "Content/" + relativePath;

  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    await res.text();

    err.style.display = "none";
    obj.style.display = "block";
    obj.src = url + "?_=" + Date.now();

    obj.onload = function () {
      hookIframeContent(obj);

      function resizeIframe() {
        const prevY = window.pageYOffset;
        obj.style.height = "auto";
        const d = obj.contentDocument || obj.contentWindow.document;
        const h = Math.max(d.documentElement.scrollHeight, d.body.scrollHeight);
        obj.style.height = 50 + h + "px";
        window.scrollTo(0, prevY);
      }

      resizeIframe();

      new MutationObserver(resizeIframe).observe(obj.contentDocument.documentElement, {
        subtree: true,
        childList: true,
        attributes: true
      });

      window.addEventListener("resize", resizeIframe);
    };
  } catch (e) {
    obj.style.display = "none";
    const rawPath = (history.state && history.state.path) ||
      new URLSearchParams(window.location.search).get("path") || "unknown";

    err.innerHTML = `
      <p>The page you are trying to load cannot be found.<br>
      It is possible it is still being created.<br>
      Please check back later.</p>
      <p><strong>Page path:</strong> ${rawPath}</p>
    `;
    err.style.display = "block";
  }
}

function loadFromURLParams(event) {
  const pathParam = (event?.state?.path) ||
    new URLSearchParams(window.location.search).get("path") || "home";
  const safe = normalizePath(pathParam);
  loadContent(safe + ".html");
}

window.addEventListener("popstate", loadFromURLParams);

document.addEventListener("DOMContentLoaded", function initApp() {
  const initialParam = new URLSearchParams(window.location.search).get("path") || "home";
  const safeInitial = normalizePath(initialParam);
  history.replaceState({ path: initialParam }, "", "?path=" + safeInitial);

  fetch("scripts/chapters.json")
    .then((res) => res.json())
    .then((chaptersData) => {
      buildMenu(chaptersData);

      document.getElementById("expandAll").onclick = () => {
        document.querySelectorAll("nav#menu li").forEach((li) => li.classList.add("open"));
      };
      document.getElementById("collapseAll").onclick = () => {
        document.querySelectorAll("nav#menu li").forEach((li) => li.classList.remove("open"));
      };

      loadFromURLParams();
    })
    .catch(console.error);

  document.addEventListener("click", function onNavClick(event) {
    const anchor = event.target.closest('a[href^="?path="]');
    if (!anchor) return;
    event.preventDefault();

    const rawPath = new URLSearchParams(anchor.getAttribute("href").slice(1)).get("path");
    if (!rawPath) return;

    const currentPath = (history.state && history.state.path) ||
      new URLSearchParams(window.location.search).get("path") || "home";

    if (rawPath === currentPath) return;

    const safe = normalizePath(rawPath);
    loadContent(safe + ".html");
    history.pushState({ path: rawPath }, "", "?path=" + safe);
  });

  window.addEventListener("message", function onDemoMessage(event) {
    const msg = event.data;
    if (msg?.type === "demo-fullscreen") {
      const frame = event.source.frameElement;
      if (frame?.requestFullscreen) {
        frame.requestFullscreen().catch(console.error);
      }
    }
  });
});