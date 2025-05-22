
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

  // 2) Wire it up to always fullscreen *this* document
  btn.addEventListener('click', () => {
    const docEl = document.documentElement;      // the <html> of *this* demo
    if (!document.fullscreenElement) {
      docEl.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen();
    }
  });
});
