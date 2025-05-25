/* chapterScripts.js */

/**
 * Show the tab panel matching the clicked button.
 * @param {Object} evt  An object with `currentTarget` pointing at the clicked tab button.
 * @param {string} lang The panel ID to show (must match `.code-container#lang`).
 */
 function openTab(evt, lang) {
  const btn   = evt.currentTarget;
  const group = btn.closest('.tab-group');
  if (!group) return;

  // 1) deactivate everything
  group.querySelectorAll('.code-container')
       .forEach(panel => panel.classList.remove('active'));
  group.querySelectorAll('.tablink')
       .forEach(tab   => tab.classList.remove('active'));

  // 2) activate the one we want
  const panel = group.querySelector(`.code-container#${lang}`);
  if (panel) panel.classList.add('active');
  btn.classList.add('active');
}

/**
 * For each .tab-group, measure all panels, lock in their size,
 * hide them, and then “open” the default tab.
 */
function initTabGroups() {
  document.querySelectorAll('.tab-group').forEach(group => {
    const panels = Array.from(group.querySelectorAll('.code-container'));

      // 1) Temporarily show them so we can measure
      panels.forEach(p => {
        p.style.display  = 'inline-block';
        p.style.width    = 'auto';
        p.style.maxWidth = 'none';
      });

    let maxH = 0, maxW = 0;
    panels.forEach(p => {
      maxH = Math.max(maxH, p.offsetHeight);
      const pre = p.querySelector('pre');
      if (pre) {
        maxW = Math.max(maxW, pre.scrollWidth + 10);
      }
    });

    // 1a) Remove the temporary inline styles so CSS can hide/show by class
    panels.forEach(p => {
      p.style.removeProperty('display');
      p.style.removeProperty('maxWidth');
    });
    
    // 1b) Then remove “active” so CSS will hide non-active panels
    panels.forEach(p => p.classList.remove('active'));

    // 2) Lock dimensions as before…
    panels.forEach(p => {
      p.style.minHeight = maxH + 'px';
      p.style.width     = maxW + 'px';
    });

    // wire up all .tablink buttons by data-lang
    document.querySelectorAll('.tablink').forEach(btn => {
      btn.addEventListener('click', evt => {
        const lang = btn.dataset.lang;
        openTab({ currentTarget: btn }, lang);
      });
    });

    // 3) “Click” the default tab
    const btn = group.querySelector('.tablink.active') || group.querySelector('.tablink');
    if (btn) {
      const lang = btn.dataset.lang || btn.id.split('-')[1];
      openTab({ currentTarget: btn }, lang);
    }
  });
}


/**
 * Hook up the “Show/Hide Answers” button.
 */
function initAnswerToggle() {
  const btn = document.getElementById('toggleAnswers');
  const ans = document.getElementById('answers');
  if (!btn || !ans) return;

  btn.addEventListener('click', () => {
    const isVisible = ans.style.display === 'block';
    ans.style.display = isVisible ? 'none' : 'block';
    btn.textContent = isVisible ? 'Show Answers' : 'Hide Answers';
    btn.setAttribute('aria-expanded', String(!isVisible));
  });
}

document.addEventListener('DOMContentLoaded', () => {
   document.body.classList.add('js-enabled');
   initAnswerToggle();

  // highlight.js current API
  if (window.hljs && typeof hljs.highlightAll === 'function') {
    hljs.highlightAll();
  }
  initTabGroups();

});
