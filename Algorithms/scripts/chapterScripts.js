
/* For the algorithms pages. */

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

document.addEventListener('DOMContentLoaded', () => {
  // 1. Grab all the code-panels
  const panels = Array.from(document.querySelectorAll('.code-container'));

  // 2. Temporarily show them so we can measure
  panels.forEach(p => p.style.display = 'block');

  // 3. Find the maximum height
  const maxH = panels.reduce((h, p) => Math.max(h, p.offsetHeight), 0);

  // 4. Hide again but lock‐in the height
  panels.forEach(p => {
    p.style.display = 'none';
    p.style.minHeight = maxH + 'px';
  });

  // 5. Finally, show the default tab
  const defaultTab = document.querySelector('.tablink.active');
  if (defaultTab) defaultTab.click();
});

window.onload = function() {
  const lang = getLanguageFromUrl();
  const validLangs = ['java', 'cpp', 'python'];
  const defaultLang = validLangs.includes(lang) ? lang : 'java';
  document.getElementById(`tab-${defaultLang}`).click();
};


    function openTab(evt, lang) {
      var i, containers = document.getElementsByClassName('code-container');
      for (i = 0; i < containers.length; i++) containers[i].style.display = 'none';
      var links = document.getElementsByClassName('tablink');
      for (i = 0; i < links.length; i++) links[i].classList.remove('active');
      document.getElementById(lang).style.display = 'block';
      evt.currentTarget.classList.add('active');
    }
	//Make the code containers a fixed height
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('pre code').forEach(block => hljs.highlightBlock(block));
      openTab({ currentTarget: document.querySelector('.tablink.active') }, 'java');
     document.querySelectorAll('pre code').forEach(block => hljs.highlightBlock(block));
     const panels = Array.from(document.querySelectorAll('.code-container'));
     
     panels.forEach(p => p.style.display = 'block');
     
     const maxH = panels.reduce((h, p) => Math.max(h, p.offsetHeight), 0);
     
     panels.forEach(p => {
       p.style.display = 'none';
       p.style.minHeight = maxH + 'px';
     });
     openTab({ currentTarget: document.querySelector('.tablink.active') }, 'java');

  

    });
 