document.addEventListener("DOMContentLoaded", () => {
  fetch('scripts/chapters.json')
    .then(res => res.json())
    .then(data => {
      buildMenu(data);
      loadFromURLParams(data);
    })
    .catch(err => console.error("Error loading chapters.json:", err));
});

function buildMenu(chapters) {
  const menu = document.getElementById("menu");
  menu.innerHTML = '';

  for (const [chapter, sections] of Object.entries(chapters)) {
    const chapterLi = document.createElement("li");
    chapterLi.innerHTML = `<strong>${chapter}</strong>`;

    const sectionsUl = document.createElement("ul");
    sections.forEach(section => {
      const sectionLi = document.createElement("li");
      const link = document.createElement("a");
      link.href = `?chapter=${encodeURIComponent(chapter)}&section=${encodeURIComponent(section.replace('.html',''))}`;
      link.textContent = section.replace('.html', '');
      link.onclick = (e) => {
        e.preventDefault();
        loadContent(chapter, section);
        history.pushState({}, '', link.href);
      };
      sectionLi.appendChild(link);
      sectionsUl.appendChild(sectionLi);
    });

    chapterLi.appendChild(sectionsUl);
    menu.appendChild(chapterLi);
  }
}

function loadContent(chapter, section) {
  const chapterFolder = chapter.replace(/\s+/g, '_').replace(/[^\w\-]/g, '');
  const sectionFile = `${section.replace(/\.html$/, '')}.html`;
  document.getElementById('content').data = `chapters/${chapterFolder}/${sectionFile}`;
}

function loadFromURLParams(chapters) {
  const params = new URLSearchParams(window.location.search);
  const chapter = params.get('chapter');
  const section = params.get('section');

  if (chapter && section && chapters[chapter]) {
    const sectionFile = chapters[chapter].find(sec => sec.replace('.html','') === section);
    if (sectionFile) {
      loadContent(chapter, sectionFile);
      return;
    }
  }
 // If nothing else, show credits.
  document.getElementById('content').data = 'credits.html';
}
