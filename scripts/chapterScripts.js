
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

  const lang = getLanguageFromUrl();
  const validLangs = ['java', 'cpp', 'python'];
  const defaultLang = validLangs.includes(lang) ? lang : 'java';
  document.getElementById(`tab-${defaultLang}`).click();
};

document.addEventListener('DOMContentLoaded', () => {
  hljs.highlightAll();

  // Tab switching logic
  const defaultLang = ['java', 'cpp', 'python'].includes(getLanguageFromUrl()) ? getLanguageFromUrl() : 'java';
  document.getElementById(`tab-${defaultLang}`)?.click();

  // Equalize code panel heights
  const panels = Array.from(document.querySelectorAll('.code-container'));
  panels.forEach(p => p.style.display = 'block');
  const maxH = panels.reduce((h, p) => Math.max(h, p.offsetHeight), 0);
  panels.forEach(p => {
    p.style.display = 'none';
    p.style.minHeight = maxH + 'px';
  });

  // Show/Hide Answers button
  const btn = document.getElementById('toggleAnswers');
  const ans = document.getElementById('answers');
  if (btn && ans) {
    btn.addEventListener('click', () => {
      const shown = ans.style.display === 'block';
      ans.style.display = shown ? 'none' : 'block';
      btn.textContent = shown ? 'Show Answers' : 'Hide Answers';
      btn.setAttribute('aria-expanded', String(!shown));
    });
  }
});
