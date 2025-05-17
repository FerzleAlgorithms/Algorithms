
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
  const lang = getLanguageFromUrl();
  const validLangs = ['java', 'cpp', 'python'];
  const defaultLang = validLangs.includes(lang) ? lang : 'java';
  document.getElementById(`tab-${defaultLang}`).click();
};
