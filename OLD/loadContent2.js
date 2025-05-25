function buildMenu(chapters, basePath = "") {
  const menu = document.querySelector("#menu ul");
  menu.innerHTML = '';

  const buildList = (items, parentUl, currentPath, isDemoSection) => {
    items.forEach(item => {
      const li = document.createElement("li");
      if (typeof item === "string") {
        const link = document.createElement("a");
        link.href = `?path=${encodeURIComponent(currentPath + item.replace('.html', ''))}`;
        let displayName = item.replace('.html', '').replace(/_/g, ' ');
        if (isDemoSection) displayName = displayName.replace(/Demo/g, '').trim();
        link.textContent = displayName;
        link.onclick = (e) => {
          e.preventDefault();
          loadContent(`${currentPath}${item}`);
          history.pushState({}, '', link.href);
        };
        li.appendChild(link);
      } else if (typeof item === "object") {
        for (const [subDir, subItems] of Object.entries(item)) {
          const span = document.createElement("span");
          span.innerHTML = `<strong>${subDir.replace(/_/g, ' ').trim()}</strong>`;
          span.onclick = () => li.classList.toggle('open');
          li.appendChild(span);
          const subUl = document.createElement("ul");
          const newPath = `${currentPath}${subDir}/`;
          buildList(subItems, subUl, newPath, isDemoSection);
          li.appendChild(subUl);
        }
      }
      parentUl.appendChild(li);
    });
  };

  for (const [chapter, contents] of Object.entries(chapters)) {
    const chapterLi = document.createElement("li");
    const span = document.createElement("span");
    span.innerHTML = `<strong>${chapter.replace(/_/g, ' ').trim()}</strong>`;
    span.onclick = () => chapterLi.classList.toggle('open');
    chapterLi.appendChild(span);
    const sectionsUl = document.createElement("ul");
    const chapterPath = `${basePath}${chapter}/`;
    const isDemoSection = chapter === "Demos";
    buildList(contents, sectionsUl, chapterPath, isDemoSection);
    chapterLi.appendChild(sectionsUl);
    menu.appendChild(chapterLi);
  }
}

function loadContent(relativePath) {
  const container    = document.getElementById('content');
  const errorMessage = document.getElementById('errorMessage');
  const encodedPath  = relativePath
    .split('/')
    .map(encodeURIComponent)
    .join('/');
  const url = `Content/${encodedPath}`;

  fetch(url, { cache: 'no-cache' })
    .then(res => {
      if (!res.ok) throw new Error('Page not founded: ${encodedPath}');
      return res.text();
    })
    .then(html => {
      errorMessage.style.display = 'none';
      container.style.display    = 'block';
      container.innerHTML        = html;
    })
    .catch(() => {
      container.style.display    = 'none';
      errorMessage.style.display = 'block';
    });
}

function loadFromURLParams() {
  const params   = new URLSearchParams(window.location.search);
  const fullPath = params.get('path');

  if (fullPath) {
    loadContent(`${fullPath}.html`);
  } else {
    loadContent('credits.html');
  }
}

window.onpopstate = loadFromURLParams;

document.addEventListener("DOMContentLoaded", () => {
  fetch('scripts/chapters.json')
    .then(res => res.json())
    .then(data => {
      buildMenu(data);
      loadFromURLParams();
    })
    .catch(err => console.error("Error loading chapters.json:", err));
});


document.addEventListener('click', e => {
  // look for the nearest <a> that has a ?path=… href
  const a = e.target.closest('a[href^="?path="]');
  if (!a) return;

  e.preventDefault();

  // pull the path param out of the href (strip leading “?”)
  const params = new URLSearchParams(a.getAttribute('href').slice(1));
  const raw  = params.get('path');           // e.g. "Problems/1_Foundational/Array Partition"
  const path = decodeURIComponent(raw) + '.html';

  // load it via AJAX and update history
  loadContent(path);
  history.pushState({}, '', `?path=${raw}`);
});

