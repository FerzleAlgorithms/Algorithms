


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

