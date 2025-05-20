
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


window.onload = function() {
  document.querySelectorAll('pre code').forEach(block => hljs.highlightBlock(block));
  // Show Java tab by default
  openTab({ currentTarget: document.querySelector('.tablink.active') }, 'java');
  // ← Measure & equalize the heights of all .code-container panels
  const panels = Array.from(document.querySelectorAll('.code-container'));
  // temporarily show each so offsetHeight is correct
  panels.forEach(p => p.style.display = 'block');
  // find the tallest
  const maxH = panels.reduce((h, p) => Math.max(h, p.offsetHeight), 0);
  // hide them again and lock in that height
  panels.forEach(p => {
    p.style.display = 'none';
    p.style.minHeight = maxH + 'px';
  });
  //This gives the show answers functionality
	   // Show/Hide Answers toggle
  const toggleBtn = document.getElementById('toggleAnswers');
  const answers  = document.getElementById('answers');
  if (toggleBtn && answers) {
    toggleBtn.addEventListener('click', () => {
      const isVisible = answers.style.display === 'block';
      answers.style.display       = isVisible ? 'none' : 'block';
      toggleBtn.textContent       = isVisible ? 'Show Answers' : 'Hide Answers';
      toggleBtn.setAttribute('aria-expanded', String(!isVisible));
    });
  }

	

  const lang = getLanguageFromUrl();
  const validLangs = ['java', 'cpp', 'python'];
  const defaultLang = validLangs.includes(lang) ? lang : 'java';
  document.getElementById(`tab-${defaultLang}`).click();
};
