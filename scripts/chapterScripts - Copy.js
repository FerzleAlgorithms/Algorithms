
/* For the algorithms pages. */

function openTab(evt,lang) {
  // find the closest wrapper
  const group = evt.currentTarget.closest('.tab-group');

  // hide only this group's code‐containers
  group.querySelectorAll('.code-container')
       .forEach(panel => panel.style.display = 'none');
  // deactivate only this group's tabs
  group.querySelectorAll('.tablink')
       .forEach(tab => tab.classList.remove('active'));

	const panel = group.querySelector(`.code-container#${lang}`);
	if (panel) panel.style.display = 'block';
	else console.warn('No panel found for', lang);

 // // show the one panel in this group
 // group.querySelector(`.code-container[data-lang="${lang}"]`)
 //      .style.display = 'block';
  // mark the clicked tab active
  evt.currentTarget.classList.add('active');
}

/*
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
*/

function getLanguageFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('language');
}


window.onload = function() {
  document.querySelectorAll('pre code').forEach(block => hljs.highlightBlock(block));
  // Show Java tab by default
  openTab({ currentTarget: document.querySelector('.tablink.active') }, 'java');
  
  /*
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
*/
// for each independent tab-group…
document.querySelectorAll('.tab-group').forEach(group => {
  // grab only that group’s panels
  const panels = Array.from(group.querySelectorAll('.code-container'));

  // 1) show them so we can measure
  panels.forEach(p => p.style.display = 'block');

  // 2) compute the max width & height among just these panels
  const maxH = panels.reduce((h, p) => Math.max(h, p.offsetHeight), 0);
  const maxW = panels.reduce((w, p) => Math.max(w, p.offsetWidth), 0);

  // 3) hide them again and lock in both dimensions
  panels.forEach(p => {
    p.style.display   = 'none';
    p.style.minHeight = maxH + 'px';
    p.style.width     = maxW + 'px';
    p.style.maxWidth     = maxW + 'px';
  });

  // 4) then “click” this group’s default tab
  const btn = group.querySelector('.tablink.active') || group.querySelector('.tablink');
  if (btn) btn.click();
});



  /*const lang = getLanguageFromUrl();
  const validLangs = ['java', 'cpp', 'python'];
  const defaultLang = validLangs.includes(lang) ? lang : 'java';
  document.getElementById(`tab-${defaultLang}`).click();
  */
  document.querySelectorAll('.tab-group').forEach(group => {
    // pick the already-marked “active” tab, or fall back to the first one
    const btn = group.querySelector('.tablink.active') 
              || group.querySelector('.tablink');
    if (btn) btn.click();
  });
};

document.addEventListener('DOMContentLoaded', () => {
  //hljs.highlightAll();

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
  document.querySelectorAll('.tab-group').forEach(group => {
    const firstTab = group.querySelector('.tablink');
    if (firstTab) firstTab.click();
  });
});
