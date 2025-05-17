function buildMenu(chapters, basePath = "") {
  const menu = document.querySelector("#menu ul");
  menu.innerHTML = '';

  const buildList = (items, parentUl, currentPath) => {
    items.forEach(item => {
      const li = document.createElement("li");
      if (typeof item === "string") {
        const link = document.createElement("a");
        link.href = `?path=${encodeURIComponent(currentPath + item.replace('.html', ''))}`;
        link.textContent = item.replace('.html', '').replace(/_/g, ' ');
        link.onclick = (e) => {
          e.preventDefault();
          loadContent(`${currentPath}${item}`);
          history.pushState({}, '', link.href);
        };
        li.appendChild(link);
      } else if (typeof item === "object") {
        for (const [subDir, subItems] of Object.entries(item)) {
          const span = document.createElement("span");
          span.innerHTML = `<strong>${subDir.replace(/_/g, ' ')}</strong>`;
          li.appendChild(span);
          const subUl = document.createElement("ul");
          const newPath = `${currentPath}${subDir}/`;
          buildList(subItems, subUl, newPath);
          li.appendChild(subUl);
        }
      }
      parentUl.appendChild(li);
    });
  };

  for (const [chapter, contents] of Object.entries(chapters)) {
    const chapterLi = document.createElement("li");
    chapterLi.innerHTML = `<strong>${chapter.replace(/_/g, ' ')}</strong>`;
    const sectionsUl = document.createElement("ul");
    const chapterPath = `${basePath}${chapter}/`;
    buildList(contents, sectionsUl, chapterPath);
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
