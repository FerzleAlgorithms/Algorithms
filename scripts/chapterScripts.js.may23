/* chapterScripts.js */

//=================================================================================
function openTab(evt, lang) {
  const btn   = evt.currentTarget;
  const group = btn.closest('.tab-group');

  // hide this group’s panels & reset tabs
  group.querySelectorAll('.code-container')
       .forEach(p => p.style.display = 'none');
  group.querySelectorAll('.tablink')
       .forEach(t => t.classList.remove('active'));

  // show the one we clicked
  const panel = group.querySelector(`.code-container#${lang}`);
  if (panel) panel.style.display = 'block';
  btn.classList.add('active');
}
//=================================================================================

document.addEventListener('DOMContentLoaded', () => { 

  //------------------------------------------------------------------
  // 2) Show/Hide Answers button
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
  //------------------------------------------------------------------
  // 1) Highlight all code samples
  hljs.highlightAll();
  // Deprecated. Use the highlightAll as above.
  ///document.querySelectorAll('pre code').forEach(block => hljs.highlightBlock(block));

  //------------------------------------------------------------------

  document.querySelectorAll('.tab-group').forEach(group => {
    const panels = Array.from(group.querySelectorAll('.code-container'));

    // 1) Temporarily show & let them size to content
    panels.forEach(p => {
      p.style.display  = 'inline-block';
      p.style.width    = 'auto';
      p.style.maxWidth = 'none';
    });

    // 2) Measure the tallest panel and the widest PRE‐content
    let maxH = 0, maxW = 0;
    panels.forEach(p => {
      maxH = Math.max(maxH, p.offsetHeight);
      const pre = p.querySelector('pre');
      // scrollWidth of the <pre> is the true content width
      maxW = Math.max(maxW, pre.scrollWidth);
	  maxW+=10; // A little buffer. Sometimes it was displaying scrollbars.
    });

    // 3) Lock in those dimensions and hide panels
    panels.forEach(p => {
      p.style.display   = 'none';
      p.style.minHeight = maxH + 'px';
      p.style.width     = maxW + 'px';
    });

    // 5) “Click” the default tab for this group
    const btn = group.querySelector('.tablink.active') || group.querySelector('.tablink');
    if (btn) openTab({ currentTarget: btn }, btn.id.split('-')[1]);
  });
});
//=================================================================================
