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
  const contentObject = document.getElementById('content');
  const errorMessage = document.getElementById('errorMessage');
  const encodedPath = relativePath.split('/').map(encodeURIComponent).join('/');
  const url = `Content/${encodedPath}`;

  fetch(url)
    .then(response => {
      if (!response.ok) throw new Error('Page not found');
      return response.text();
    })
    .then(() => {
      errorMessage.style.display = 'none';
      contentObject.style.display = 'block';
      contentObject.data = url;
    })
    .catch(() => {
      contentObject.style.display = 'none';
      errorMessage.style.display = 'block';
    });
}


function loadFromURLParams() {
  const params = new URLSearchParams(window.location.search);
  const fullPath = params.get('path');
  const contentObject = document.getElementById('content');

  if (fullPath) {
    loadContent(`${fullPath}.html`);
  } else {
    contentObject.data = 'credits.html';
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
