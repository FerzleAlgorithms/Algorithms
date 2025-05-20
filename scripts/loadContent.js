// scripts/loadContent.js

// 1) Build the sidebar menu from chapters.json
function buildMenu(chapters, basePath = "") {
  const menu = document.querySelector("#menu ul");
  menu.innerHTML = "";

  function buildList(items, parentUl, currentPath, isDemo) {
    for (const item of items) {
      const li = document.createElement("li");

      if (typeof item === "string") {
        // leaf: an HTML page
        const name = item.replace(/\.html$/, "").replace(/_/g, " ");
        const a = document.createElement("a");
        a.href = `?path=${encodeURIComponent(currentPath + name)}`;
        a.textContent = isDemo
          ? name.replace(/Demo/g, "").trim()
          : name;
        li.appendChild(a);

      } else {
        // subtree: a directory
        for (const [dir, subItems] of Object.entries(item)) {
          const span = document.createElement("span");
          span.textContent = dir.replace(/_/g, " ");
          span.onclick = () => li.classList.toggle("open");
          li.appendChild(span);

          const subUl = document.createElement("ul");
          buildList(subItems, subUl, currentPath + dir + "/", isDemo);
          li.appendChild(subUl);
        }
      }

      parentUl.appendChild(li);
    }
  }

  for (const [chap, contents] of Object.entries(chapters)) {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = chap.replace(/_/g, " ");
    span.onclick = () => li.classList.toggle("open");
    li.appendChild(span);

    const subUl = document.createElement("ul");
    buildList(contents, subUl, chap + "/", chap === "Demos");
    li.appendChild(subUl);

    menu.appendChild(li);
  }
}
function loadContent(relativePath) {
  const obj = document.getElementById("content");
  const err = document.getElementById("errorMessage");

  // build the URL we want to fetch
  const urlBase = `Content/${relativePath}`;

  return fetch(urlBase, { cache: "no-cache" })
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.text();
    })
    .then(() => {
      // hide any old error, show the object
      err.style.display = "none";
      obj.style.display = "block";

      // force the object to reload the new page
      const bustUrl = `${urlBase}?_=${Date.now()}`;
      obj.data = bustUrl;

      // **once the object’s document is ready**, hook its links
      obj.onload = () => {
        const edoc = obj.contentDocument;
        if (!edoc) return;

        // a) Intercept internal ?path=… clicks
        edoc.addEventListener("click", e => {
          const a = e.target.closest('a[href]');
          if (!a) return;

          const href = a.getAttribute("href");
          if (href.startsWith("?path=")) {
            e.preventDefault();
            const raw = new URLSearchParams(href.slice(1)).get("path");
            if (!raw) return;

            // normalize to match your filenames
            const norm = raw
              .split("/")
              .map(decodeURIComponent)
              .map(encodeURIComponent)
              .join("/");
            const htmlPath = `${norm}.html`;

            // call the parent’s loader
            parent.loadContent(htmlPath).catch(() => {});
            parent.history.pushState({}, "", `?path=${raw}`);
          }
        });

        // b) Force all other links to break out of the object
        edoc
          .querySelectorAll('a[href]:not([href^="?path="])')
          .forEach(a => {
            a.setAttribute("target", "_top");
          });
      };
    })
    .catch(e => {
      console.error("loadContent error:", e);
      // hide the <object>
      obj.style.display = "none";

      // show a descriptive error including the page name and HTTP status
      err.textContent =
        `Error loading content: Page "${relativePath}" could not be loaded (${e.message}).`;
      err.style.display = "block";

      // re-throw if you need upstream handlers to catch it, otherwise you can omit this
      throw e;
    });
}


// 3) Handle back/forward and initial load
function loadFromURLParams() {
  const p = new URLSearchParams(window.location.search).get("path");
  if (p) {
    // normalize encoding
    const norm = p
      .split("/")
      .map(decodeURIComponent)
      .map(encodeURIComponent)
      .join("/");
    loadContent(`${norm}.html`).catch(() => {});
  } else {
    loadContent("credits.html").catch(() => {});
  }
}
window.addEventListener("popstate", loadFromURLParams);

// 4) DOMContentLoaded — fetch chapters, build menu, show first page,
//    and install one delegated click listener
document.addEventListener("DOMContentLoaded", () => {
  fetch("scripts/chapters.json")
    .then(r => r.json())
    .then(chapters => {
      buildMenu(chapters);
      loadFromURLParams();
    })
    .catch(e => console.error("Error loading chapters.json:", e));

  // delegate only links that start with "?path="
  document.addEventListener("click", e => {
    const a = e.target.closest('a[href^="?path="]');
    if (!a) return;           // ignore everything else
    e.preventDefault();

    const raw = new URLSearchParams(a.getAttribute("href").slice(1)).get("path");
    if (!raw) return;

    const norm = raw
      .split("/")
      .map(decodeURIComponent)
      .map(encodeURIComponent)
      .join("/");
    const htmlPath = `${norm}.html`;

    loadContent(htmlPath).catch(() => {});
    history.pushState({}, "", `?path=${raw}`);
  });
});
