

//--------------------------------------------------------
// The fullscreen button
document.addEventListener('DOMContentLoaded', () => {
// Create button
  const btn = document.createElement('button');
  // Style button
  btn.textContent = '⤢ Fullscreen';
  Object.assign(btn.style, {
    position:  'fixed',
    top:       '0px',
    right:     '10px',
    padding:   '0em 1em',
    cursor:    'pointer',
    zIndex:    9999
  });
  // Put the button on the page.
  document.body.appendChild(btn);
  // add listener so it does the fullscreen.
  /*
  btn.addEventListener('click', () => {
    const container = document.getElementById('demoContainer');
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen();
    }
    });
  */
  btn.addEventListener('click', () => {
    const html = document.documentElement;
    if (!document.fullscreenElement) {
      html.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen();
    }
  });
  
});
//--------------------------------------------------------
/*
function generateRandomArray(sizeInput,inputValues) {
  size = +sizeInput.value;
  const minV = parseInt(sizeInput.min);
  const maxV = parseInt(sizeInput.max);
  if(size < minV) {
      size = minV;
      sizeInput.value = minV;
  }
  if(size > maxV) {
     size = maxV;
     sizeInput.value = maxV;
  }

  array = Array.from({length: size}, () => Math.floor(Math.random() * 100));
  inputValues.value = array.join(',');
}
*/
//--------------------------------------------------------

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

  function go(n, prevBtn, nextBtn, playBtn) {
    idx = n;
    if (typeof window.renderStep === 'function') {
      window.renderStep(steps, idx, original);
    }
    updateButtons(prevBtn, nextBtn);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const controls = ['prev','next','play','speed','generate','useCustom']
      .map(id => document.getElementById(id));

    if (controls.some(el => el === null)) {
      return;  // at least one required control is missing
    }
    
    const [prevBtn, nextBtn, playBtn,  speedSelect, genBtn, useCustomBtn] = controls;

    prevBtn.onclick = () => {
      clearInterval(timer);
      playBtn.textContent='Play';
      timer = null;
      if (idx > 0) go(idx - 1, prevBtn, nextBtn, playBtn);
    };
    nextBtn.onclick = () => {
      clearInterval(timer);
      playBtn.textContent='Play';
     timer = null;
      if (idx < steps.length - 1) go(idx + 1, prevBtn, nextBtn, playBtn);
    };
    playBtn.onclick = () => {
  if (timer) {
    // ▶ currently playing → pause
    clearInterval(timer);
    timer = null;
    playBtn.textContent = 'Play';
  } else {
    // ▶ currently paused → start playing
    playBtn.textContent = 'Pause';
    const speed = parseInt(speedSelect.value, 10) || 1;
    timer = setInterval(() => {
      if (idx < steps.length - 1) {
        go(idx + 1, prevBtn, nextBtn, playBtn);
      } else {
        // reached the end → stop
        clearInterval(timer);
        timer = null;
        playBtn.textContent = 'Play';
      }
    }, baseInterval / speed);
  }
};

    function start(arr) {
      original = arr.slice();
      if (typeof window.setupAux === 'function') {
        window.setupAux(original, original.length);
      }
      if (typeof window.genSteps === 'function') {
        steps = window.genSteps(arr);
      }
      go(0, prevBtn, nextBtn, playBtn);
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
