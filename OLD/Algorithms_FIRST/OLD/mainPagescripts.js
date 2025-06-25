document.addEventListener("DOMContentLoaded", () => {
  fetch("chapters.json")
    .then(response => response.json())
    .then(data => buildMenu(data))
    .catch(error => console.error("Error loading chapters.json:", error));
});

function buildMenu(chapters) {
  const menu = document.getElementById("menu");
  const ul = document.createElement("ul");

  for (const [chapter, sections] of Object.entries(chapters)) {
    const chapterLi = document.createElement("li");
    chapterLi.innerHTML = `<strong>${chapter}</strong>`;

    const sectionUl = document.createElement("ul");
    sections.forEach(section => {
      const sectionLi = document.createElement("li");
      const chapterFolder = chapter.replace(/\s+/g, '_').replace(/[^\w\-]/g, '');
      sectionLi.innerHTML = `<a href="#" onclick="loadContent('chapters/${chapterFolder}/${section}'); return false;">
          ${section.replace('.html', '')}
        </a>`;
      sectionUl.appendChild(sectionLi);
    });

    chapterLi.appendChild(sectionUl);
    ul.appendChild(chapterLi);
  }

  menu.appendChild(ul);
}

function loadContent(url) {
  document.getElementById("contentFrame").src = url;
}


function openTab(evt, lang) {
  const containers = document.getElementsByClassName('code-container');
  const tabs = document.getElementsByClassName('tablink');
  for (let container of containers) {
	container.style.display = 'none';
  }
  for (let tab of tabs) {
	tab.classList.remove('active');
  }
  document.getElementById(lang).style.display = 'block';
  evt.currentTarget.classList.add('active');
}

function getLanguageFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('language');
}

window.onload = function() {
  const lang = getLanguageFromUrl();
  const validLangs = ['java', 'cpp', 'python'];
  const defaultLang = validLangs.includes(lang) ? lang : 'java';
  document.getElementById(`tab-${defaultLang}`).click();
};
