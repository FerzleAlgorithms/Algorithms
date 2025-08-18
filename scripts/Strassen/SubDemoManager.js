class SubDemoManager {
  static showSubDemo(matA, matB, label, expr, onComplete) {
    // If the subproblem is 1×1, there's nothing to visualize—compute directly.
    if (matA.length === 1) {
      const res = MatrixUtils.strassenMultiply(matA, matB).result;
      if (typeof onComplete === 'function') onComplete(res);
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'demo-overlay';

    overlay.innerHTML = `
      <div class="demo-container">
        <button class="close-overlay">Close</button>
        <h3>Computing ${label} = ${expr}</h3>
        <div id="sub-matrix-row" style="display:flex;gap:0.25em;margin-bottom:1em;">
          <div class="matrix-panel">
            <div id="sub-matrix-a" class="matrix-container"></div>
            <div class="matrix-label">A</div>
          </div>
          <div class="matrix-op">×</div>
          <div class="matrix-panel">
            <div id="sub-matrix-b" class="matrix-container"></div>
            <div class="matrix-label">B</div>
          </div>
          <div class="matrix-op">=</div>
          <div class="matrix-panel">
            <div id="sub-matrix-res" class="matrix-container"></div>
            <div class="matrix-label">Result</div>
          </div>
        </div>
        <div id="sub-computations" style="max-height:350px;overflow-y:auto;margin:.25em 0;"></div>
        <div id="sub-comment" class="comment">Compute the seven products.</div>
      </div>
    `;

    document.body.appendChild(overlay);

    const containers = {
      matA: overlay.querySelector('#sub-matrix-a'),
      matB: overlay.querySelector('#sub-matrix-b'),
      matR: overlay.querySelector('#sub-matrix-res'),
      commentBox: overlay.querySelector('#sub-comment'),
      computations: overlay.querySelector('#sub-computations')
    };

    const demo = new DemoManager(containers, {});
    // suppress counter reset so subdemo doesn't clear the main page tally
    demo.generateDemoFromMatrices(matA, matB);
    // For subdemos with 2x2 matrices avoid overlays (they hide numbers).
    // DemoManager.updateStepUI already checks this.n > 2 before showing overlays,
    // so simply set step to computations and rely on that condition.
    if (typeof demo.setStep === 'function') demo.setStep(2);

    overlay.querySelector('.close-overlay').addEventListener('click', () => {
      document.body.removeChild(overlay);
      const res = demo.finalResult || MatrixUtils.strassenMultiply(matA, matB).result;
      if (typeof onComplete === 'function') onComplete(res);
    });
  }
}
