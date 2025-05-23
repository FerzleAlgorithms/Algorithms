


document.addEventListener('DOMContentLoaded', () => {
  // 1) Create & style the button
  const btn = document.createElement('button');
  btn.textContent = '⤢ Fullscreen';
  Object.assign(btn.style, {
    position:  'fixed',
    top:       '10px',
    right:     '10px',
    padding:   '0.5em 1em',
    cursor:    'pointer',
    zIndex:    9999
  });
  document.body.appendChild(btn);

btn.addEventListener('click', () => {
    const html = document.documentElement;
    if (!document.fullscreenElement) {
      html.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen();
    }
  });
  
});

// demoScripts.js
// This script wires playback controls (Prev/Next/Play/Pause/Speed) for any demo
(function() {
  let steps = [];
  let idx = 0;
  let timer = null;
  const baseInterval = 800;
  let original = [];

  function updateButtons(prevBtn, nextBtn) {
    prevBtn.disabled = idx === 0;
    nextBtn.disabled = idx === steps.length - 1;
  }

  function go(n, prevBtn, nextBtn, playBtn, pauseBtn) {
    idx = n;
    if (typeof window.renderStep === 'function') {
      window.renderStep(steps, idx, original);
    }
    updateButtons(prevBtn, nextBtn);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const prevBtn = document.getElementById('prev');
    const nextBtn = document.getElementById('next');
    const playBtn = document.getElementById('play');
    const pauseBtn = document.getElementById('pause');
    const speedSelect = document.getElementById('speed');
    const genBtn = document.getElementById('generate');
    const useCustomBtn = document.getElementById('useCustom');

    prevBtn.onclick = () => {
      clearInterval(timer);
      playBtn.disabled = false;
      pauseBtn.disabled = true;
      if (idx > 0) go(idx - 1, prevBtn, nextBtn, playBtn, pauseBtn);
    };
    nextBtn.onclick = () => {
      clearInterval(timer);
      playBtn.disabled = false;
      pauseBtn.disabled = true;
      if (idx < steps.length - 1) go(idx + 1, prevBtn, nextBtn, playBtn, pauseBtn);
    };
    playBtn.onclick = () => {
      playBtn.disabled = true;
      pauseBtn.disabled = false;
      const speed = parseInt(speedSelect.value, 10) || 1;
      timer = setInterval(() => {
        if (idx < steps.length - 1) {
          go(idx + 1, prevBtn, nextBtn, playBtn, pauseBtn);
        } else {
          clearInterval(timer);
          playBtn.disabled = false;
          pauseBtn.disabled = true;
        }
      }, baseInterval / speed);
    };
    pauseBtn.onclick = () => {
      clearInterval(timer);
      playBtn.disabled = false;
      pauseBtn.disabled = true;
    };

    function start(arr) {
      original = arr.slice();
      if (typeof window.setupAux === 'function') {
        window.setupAux(original, original.length);
      }
      if (typeof window.genSteps === 'function') {
        steps = window.genSteps(arr);
      }
      go(0, prevBtn, nextBtn, playBtn, pauseBtn);
    }

    genBtn.onclick = () => {
      if (typeof window.onGenerate === 'function') {
        start(window.onGenerate(false));
      }
    };
    useCustomBtn.onclick = () => {
      if (typeof window.onGenerate === 'function') {
        start(window.onGenerate(true));
      }
    };

    // trigger initial
    genBtn.click();
  });
})();