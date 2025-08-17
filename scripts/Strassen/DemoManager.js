class DemoManager {
  constructor(containers, buttons = {}) {
    this.containers = containers;
    this.buttons = buttons;
    this.A = [];
    this.B = [];
    this.M = {};
    this.finalResult = null;

    // Step state
    this.step = 0;        // 0: matrices only, 1: overlays, 2: computations
    this.maxStep = 2;
    this.computationsBuilt = false;
    this.nextComputeIndex = 0; // index of next product to compute

    if (this.buttons.generate) {
      this.buttons.generate.addEventListener('click', () => this.generateNewDemo());
    }
    if (this.buttons.prev) {
      this.buttons.prev.addEventListener('click', () => this.prevStep());
    }
    if (this.buttons.next) {
      this.buttons.next.addEventListener('click', () => this.nextStep());
    }
  }

  generateNewDemo() {
    const n = parseInt(document.getElementById('dim-input').value, 10);
    const A = MatrixUtils.genRandomMatrix(n);
    const B = MatrixUtils.genRandomMatrix(n);
    this.generateDemoFromMatrices(A, B);
  }

  generateDemoFromMatrices(A, B) {
    this.A = A;
    this.B = B;
    this.n = A.length;
    this.M = {};
    // Do not set a zero matrix here — leave null until computation completes.
    // This prevents subdemos closed early from returning an uncomputed zero matrix.
    this.finalResult = null;

    // Hide any old overlays first to guarantee Step 0 view
    OverlayManager.hideOverlay(this.containers.matA);
    OverlayManager.hideOverlay(this.containers.matB);
    OverlayManager.hideOverlay(this.containers.matR);

    // Disallow overlays at Step 0
    this.containers.matA.dataset.overlayAllowed = 'false';
    this.containers.matB.dataset.overlayAllowed = 'false';
    this.containers.matR.dataset.overlayAllowed = 'false';

    MatrixRenderer.renderMatrix(this.containers.matA, A);
    MatrixRenderer.renderMatrix(this.containers.matB, B);
    MatrixRenderer.renderMatrix(this.containers.matR, MatrixUtils.initZeroMatrix(this.n));

    // Start at Step 0
    this.step = 0;
    this.computationsBuilt = false;
    this.nextComputeIndex = 0; // reset sequential progression
    this.updateStepUI();
  }

  // Navigation
  prevStep() {
    this.setStep(this.step - 1);
  }
  nextStep() {
    this.setStep(this.step + 1);
  }
  setStep(s) {
    this.step = Math.max(0, Math.min(this.maxStep, s));
    this.updateStepUI();
  }

  updateStepUI() {
    // Enable/disable nav buttons
    if (this.buttons.prev) this.buttons.prev.disabled = this.step === 0;
    if (this.buttons.next) this.buttons.next.disabled = this.step === this.maxStep;

    // Step 0: matrices only
    if (this.step === 0) {
      // Disallow overlays and ensure they’re hidden
      this.containers.matA.dataset.overlayAllowed = 'false';
      this.containers.matB.dataset.overlayAllowed = 'false';
      this.containers.matR.dataset.overlayAllowed = 'false';
      OverlayManager.hideOverlay(this.containers.matA);
      OverlayManager.hideOverlay(this.containers.matB);
      OverlayManager.hideOverlay(this.containers.matR);
      if (this.containers.computations) this.containers.computations.innerHTML = '';
      if (this.containers.commentBox) this.containers.commentBox.textContent = 'Matrices ready. Click Next to show quadrants.';
      return;
    }

    // Step 1: show overlays
    if (this.step === 1) {
      // Only show overlays for sizes > 2 (2x2 overlays hide numbers)
      if (this.n > 2) {
        this.containers.matA.dataset.overlayAllowed = 'true';
        this.containers.matB.dataset.overlayAllowed = 'true';
        this.containers.matR.dataset.overlayAllowed = 'true';
        OverlayManager.showOverlay(this.containers.matA, this.n);
        OverlayManager.showOverlay(this.containers.matB, this.n);
        OverlayManager.showOverlay(this.containers.matR, this.n);
      }
      if (this.containers.computations) this.containers.computations.innerHTML = '';
      if (this.containers.commentBox) this.containers.commentBox.textContent = 'Quadrants shown. Click Next to set up Strassen products.';
      return;
    }

    // Step 2: show computations list (build once)
    if (this.step === 2) {
      // Only show overlays for sizes > 2
      if (this.n > 2) {
        this.containers.matA.dataset.overlayAllowed = 'true';
        this.containers.matB.dataset.overlayAllowed = 'true';
        this.containers.matR.dataset.overlayAllowed = 'true';
        OverlayManager.showOverlay(this.containers.matA, this.n);
        OverlayManager.showOverlay(this.containers.matB, this.n);
        OverlayManager.showOverlay(this.containers.matR, this.n);
      }
      if (!this.computationsBuilt) {
        this.buildComputationList();
        this.computationsBuilt = true;
      }
      if (this.containers.commentBox) this.containers.commentBox.textContent = 'Compute the seven products.';
    }
  }

  buildComputationList() {
    const m = this.n / 2;
    const A11 = MatrixUtils.extractSubmatrix(this.A, 0, 0, m);
    const A12 = MatrixUtils.extractSubmatrix(this.A, 0, m, m);
    const A21 = MatrixUtils.extractSubmatrix(this.A, m, 0, m);
    const A22 = MatrixUtils.extractSubmatrix(this.A, m, m, m);

    const B11 = MatrixUtils.extractSubmatrix(this.B, 0, 0, m);
    const B12 = MatrixUtils.extractSubmatrix(this.B, 0, m, m);
    const B21 = MatrixUtils.extractSubmatrix(this.B, m, 0, m);
    const B22 = MatrixUtils.extractSubmatrix(this.B, m, m, m);

    // Define each M_i with actual submatrices for each term
    const defs = [
      { key: 'M1',
        left:  { type: 'op', op: '+', left: { label: 'A11', M: A11 }, right: { label: 'A22', M: A22 } },
        right: { type: 'op', op: '+', left: { label: 'B11', M: B11 }, right: { label: 'B22', M: B22 } } },
      { key: 'M2',
        left:  { type: 'op', op: '+', left: { label: 'A21', M: A21 }, right: { label: 'A22', M: A22 } },
        right: { type: 'matrix', label: 'B11', M: B11 } },
      { key: 'M3',
        left:  { type: 'matrix', label: 'A11', M: A11 },
        right: { type: 'op', op: '-', left: { label: 'B12', M: B12 }, right: { label: 'B22', M: B22 } } },
      { key: 'M4',
        left:  { type: 'matrix', label: 'A22', M: A22 },
        right: { type: 'op', op: '-', left: { label: 'B21', M: B21 }, right: { label: 'B11', M: B11 } } },
      { key: 'M5',
        left:  { type: 'op', op: '+', left: { label: 'A11', M: A11 }, right: { label: 'A12', M: A12 } },
        right: { type: 'matrix', label: 'B22', M: B22 } },
      { key: 'M6',
        left:  { type: 'op', op: '-', left: { label: 'A21', M: A21 }, right: { label: 'A11', M: A11 } },
        right: { type: 'op', op: '+', left: { label: 'B11', M: B11 }, right: { label: 'B12', M: B12 } } },
      { key: 'M7',
        left:  { type: 'op', op: '-', left: { label: 'A12', M: A12 }, right: { label: 'A22', M: A22 } },
        right: { type: 'op', op: '+', left: { label: 'B21', M: B21 }, right: { label: 'B22', M: B22 } } }
    ];

    const container = this.containers.computations;
    if (container) {
      container.innerHTML = '';
      this.nextComputeIndex = 0; // reset sequence
      defs.forEach((def, idx) => this.addComputationRow(container, def, idx));
      // attempt to enable the first row if ready
      this.enableRowIfReady(0);
    }
  }

  addComputationRow(container, def, idx) {
    const self = this; // keep class context for closures

    const row = document.createElement('div');
    row.className = 'strassen-row';

    // Inline computation layout
    const mc = document.createElement('div');
    mc.className = 'matrix-computation';

    // Add product key label (e.g. "M1 =") at the start
    const keyLabel = document.createElement('span');
    keyLabel.className = 'formula';
    keyLabel.textContent = `${def.key} = `;
    mc.appendChild(keyLabel);

    // Track readiness of both terms
    let leftReady = false, rightReady = false;
    let leftResult = null, rightResult = null;

    // --- create action buttons early so renderTerm/onComputed can safely call updateControls ---
    let computeBtn = document.createElement('button');
    computeBtn.textContent = 'Compute';
    computeBtn.disabled = true;
    computeBtn.dataset.rowIndex = idx;
    computeBtn.addEventListener('click', () => {
      const { result } = MatrixUtils.strassenMultiply(leftResult, rightResult);
      this.storeResult(def.key, result, resultSpan, computeBtn, showBtn);
    });

    let showBtn = document.createElement('button');
    showBtn.textContent = 'Show Computation';
    showBtn.disabled = true;
    showBtn.dataset.rowIndex = idx;
    showBtn.addEventListener('click', () => {
      const exprText = `${this.termExpr(def.left)} × ${this.termExpr(def.right)}`;
      SubDemoManager.showSubDemo(leftResult, rightResult, def.key, exprText, (res) => {
        this.storeResult(def.key, res, resultSpan, computeBtn, showBtn);
      });
    });
    // --- end early creation ---

    // If this is a 2x2 demo (subdemo base case), hide the Show Computation button
    if (this.n === 2) {
      showBtn.style.display = 'none';
    }

    // pass idx so renderTerm can attach dataset/index if needed
    const leftNode = this.renderTerm(def.left, 'term1', (res) => {
      leftResult = res; leftReady = true; updateControls();
      // If rendered term updated readiness, attempt to enable current sequential row
      self.enableRowIfReady(idx);
    });
    const times = MatrixRenderer.createOperator('×');
    const rightNode = this.renderTerm(def.right, 'term2', (res) => {
      rightResult = res; rightReady = true; updateControls();
      self.enableRowIfReady(idx);
    });
    const equals = MatrixRenderer.createOperator('=');

    const resultSpan = document.createElement('span');
    resultSpan.className = 'result';
    const resultHolder = document.createElement('div');
    resultHolder.className = 'result-placeholder';
    resultSpan.appendChild(resultHolder);

    mc.appendChild(leftNode);
    mc.appendChild(times);
    mc.appendChild(rightNode);
    mc.appendChild(equals);
    mc.appendChild(resultSpan);

    // Insert controls immediately after the result inside the computation area
    const controlsWrap = document.createElement('div');
    controlsWrap.className = 'term-buttons';
    controlsWrap.appendChild(computeBtn);
    controlsWrap.appendChild(showBtn);

    // Put the controls beside the result (inside mc) so they stay next to the result.
    mc.appendChild(controlsWrap);

    row.appendChild(mc);
    container.appendChild(row);

    // Initialize readiness for plain terms (renderTerm will call onComputed)
    // leftResult/rightResult will be set by callbacks above when ready
    updateControls();

    function updateControls() {
      const ready = leftReady && rightReady;
      // Only allow compute/show for the current sequential index
      const allowedBySequence = idx === self.nextComputeIndex;
      // computeBtn/showBtn were created early so they exist here
      computeBtn.disabled = !(ready && allowedBySequence);
      // ensure showBtn follows same rules if visible
      if (showBtn.style.display !== 'none') showBtn.disabled = !(ready && allowedBySequence);
    }
  }

  // Navigation
  prevStep() {
    this.setStep(this.step - 1);
  }
  nextStep() {
    this.setStep(this.step + 1);
  }
  setStep(s) {
    this.step = Math.max(0, Math.min(this.maxStep, s));
    this.updateStepUI();
  }

  updateStepUI() {
    // Enable/disable nav buttons
    if (this.buttons.prev) this.buttons.prev.disabled = this.step === 0;
    if (this.buttons.next) this.buttons.next.disabled = this.step === this.maxStep;

    // Step 0: matrices only
    if (this.step === 0) {
      // Disallow overlays and ensure they’re hidden
      this.containers.matA.dataset.overlayAllowed = 'false';
      this.containers.matB.dataset.overlayAllowed = 'false';
      this.containers.matR.dataset.overlayAllowed = 'false';
      OverlayManager.hideOverlay(this.containers.matA);
      OverlayManager.hideOverlay(this.containers.matB);
      OverlayManager.hideOverlay(this.containers.matR);
      if (this.containers.computations) this.containers.computations.innerHTML = '';
      if (this.containers.commentBox) this.containers.commentBox.textContent = 'Matrices ready. Click Next to show quadrants.';
      return;
    }

    // Step 1: show overlays
    if (this.step === 1) {
      // Only show overlays for sizes > 2 (2x2 overlays hide numbers)
      if (this.n > 2) {
        this.containers.matA.dataset.overlayAllowed = 'true';
        this.containers.matB.dataset.overlayAllowed = 'true';
        this.containers.matR.dataset.overlayAllowed = 'true';
        OverlayManager.showOverlay(this.containers.matA, this.n);
        OverlayManager.showOverlay(this.containers.matB, this.n);
        OverlayManager.showOverlay(this.containers.matR, this.n);
      }
      if (this.containers.computations) this.containers.computations.innerHTML = '';
      if (this.containers.commentBox) this.containers.commentBox.textContent = 'Quadrants shown. Click Next to set up Strassen products.';
      return;
    }

    // Step 2: show computations list (build once)
    if (this.step === 2) {
      // Only show overlays for sizes > 2
      if (this.n > 2) {
        this.containers.matA.dataset.overlayAllowed = 'true';
        this.containers.matB.dataset.overlayAllowed = 'true';
        this.containers.matR.dataset.overlayAllowed = 'true';
        OverlayManager.showOverlay(this.containers.matA, this.n);
        OverlayManager.showOverlay(this.containers.matB, this.n);
        OverlayManager.showOverlay(this.containers.matR, this.n);
      }
      if (!this.computationsBuilt) {
        this.buildComputationList();
        this.computationsBuilt = true;
      }
      if (this.containers.commentBox) this.containers.commentBox.textContent = 'Compute the seven products.';
    }
  }

  buildComputationList() {
    const m = this.n / 2;
    const A11 = MatrixUtils.extractSubmatrix(this.A, 0, 0, m);
    const A12 = MatrixUtils.extractSubmatrix(this.A, 0, m, m);
    const A21 = MatrixUtils.extractSubmatrix(this.A, m, 0, m);
    const A22 = MatrixUtils.extractSubmatrix(this.A, m, m, m);

    const B11 = MatrixUtils.extractSubmatrix(this.B, 0, 0, m);
    const B12 = MatrixUtils.extractSubmatrix(this.B, 0, m, m);
    const B21 = MatrixUtils.extractSubmatrix(this.B, m, 0, m);
    const B22 = MatrixUtils.extractSubmatrix(this.B, m, m, m);

    // Define each M_i with actual submatrices for each term
    const defs = [
      { key: 'M1',
        left:  { type: 'op', op: '+', left: { label: 'A11', M: A11 }, right: { label: 'A22', M: A22 } },
        right: { type: 'op', op: '+', left: { label: 'B11', M: B11 }, right: { label: 'B22', M: B22 } } },
      { key: 'M2',
        left:  { type: 'op', op: '+', left: { label: 'A21', M: A21 }, right: { label: 'A22', M: A22 } },
        right: { type: 'matrix', label: 'B11', M: B11 } },
      { key: 'M3',
        left:  { type: 'matrix', label: 'A11', M: A11 },
        right: { type: 'op', op: '-', left: { label: 'B12', M: B12 }, right: { label: 'B22', M: B22 } } },
      { key: 'M4',
        left:  { type: 'matrix', label: 'A22', M: A22 },
        right: { type: 'op', op: '-', left: { label: 'B21', M: B21 }, right: { label: 'B11', M: B11 } } },
      { key: 'M5',
        left:  { type: 'op', op: '+', left: { label: 'A11', M: A11 }, right: { label: 'A12', M: A12 } },
        right: { type: 'matrix', label: 'B22', M: B22 } },
      { key: 'M6',
        left:  { type: 'op', op: '-', left: { label: 'A21', M: A21 }, right: { label: 'A11', M: A11 } },
        right: { type: 'op', op: '+', left: { label: 'B11', M: B11 }, right: { label: 'B12', M: B12 } } },
      { key: 'M7',
        left:  { type: 'op', op: '-', left: { label: 'A12', M: A12 }, right: { label: 'A22', M: A22 } },
        right: { type: 'op', op: '+', left: { label: 'B21', M: B21 }, right: { label: 'B22', M: B22 } } }
    ];

    const container = this.containers.computations;
    if (container) {
      container.innerHTML = '';
      this.nextComputeIndex = 0; // reset sequence
      defs.forEach((def, idx) => this.addComputationRow(container, def, idx));
      // attempt to enable the first row if ready
      this.enableRowIfReady(0);
    }
  }

  addComputationRow(container, def, idx) {
    const self = this; // keep class context for closures

    const row = document.createElement('div');
    row.className = 'strassen-row';

    // Inline computation layout
    const mc = document.createElement('div');
    mc.className = 'matrix-computation';

    // Add product key label (e.g. "M1 =") at the start
    const keyLabel = document.createElement('span');
    keyLabel.className = 'formula';
    keyLabel.textContent = `${def.key} = `;
    mc.appendChild(keyLabel);

    // Track readiness of both terms
    let leftReady = false, rightReady = false;
    let leftResult = null, rightResult = null;

    // --- create action buttons early so renderTerm/onComputed can safely call updateControls ---
    let computeBtn = document.createElement('button');
    computeBtn.textContent = 'Compute';
    computeBtn.disabled = true;
    computeBtn.dataset.rowIndex = idx;
    computeBtn.addEventListener('click', () => {
      const { result } = MatrixUtils.strassenMultiply(leftResult, rightResult);
      this.storeResult(def.key, result, resultSpan, computeBtn, showBtn);
    });

    let showBtn = document.createElement('button');
    showBtn.textContent = 'Show Computation';
    showBtn.disabled = true;
    showBtn.dataset.rowIndex = idx;
    showBtn.addEventListener('click', () => {
      const exprText = `${this.termExpr(def.left)} × ${this.termExpr(def.right)}`;
      SubDemoManager.showSubDemo(leftResult, rightResult, def.key, exprText, (res) => {
        this.storeResult(def.key, res, resultSpan, computeBtn, showBtn);
      });
    });
    // --- end early creation ---

    // If this is a 2x2 demo (subdemo base case), hide the Show Computation button
    if (this.n === 2) {
      showBtn.style.display = 'none';
    }

    // pass idx so renderTerm can attach dataset/index if needed
    const leftNode = this.renderTerm(def.left, 'term1', (res) => {
      leftResult = res; leftReady = true; updateControls();
      // If rendered term updated readiness, attempt to enable current sequential row
      self.enableRowIfReady(idx);
    });
    const times = MatrixRenderer.createOperator('×');
    const rightNode = this.renderTerm(def.right, 'term2', (res) => {
      rightResult = res; rightReady = true; updateControls();
      self.enableRowIfReady(idx);
    });
    const equals = MatrixRenderer.createOperator('=');

    const resultSpan = document.createElement('span');
    resultSpan.className = 'result';
    const resultHolder = document.createElement('div');
    resultHolder.className = 'result-placeholder';
    resultSpan.appendChild(resultHolder);

    mc.appendChild(leftNode);
    mc.appendChild(times);
    mc.appendChild(rightNode);
    mc.appendChild(equals);
    mc.appendChild(resultSpan);

    // Insert controls immediately after the result inside the computation area
    const controlsWrap = document.createElement('div');
    controlsWrap.className = 'term-buttons';
    controlsWrap.appendChild(computeBtn);
    controlsWrap.appendChild(showBtn);

    // Put the controls beside the result (inside mc) so they stay next to the result.
    mc.appendChild(controlsWrap);

    row.appendChild(mc);
    container.appendChild(row);

    // Initialize readiness for plain terms (renderTerm will call onComputed)
    // leftResult/rightResult will be set by callbacks above when ready
    updateControls();

    function updateControls() {
      const ready = leftReady && rightReady;
      // Only allow compute/show for the current sequential index
      const allowedBySequence = idx === self.nextComputeIndex;
      // computeBtn/showBtn were created early so they exist here
      computeBtn.disabled = !(ready && allowedBySequence);
      // ensure showBtn follows same rules if visible
      if (showBtn.style.display !== 'none') showBtn.disabled = !(ready && allowedBySequence);
    }
  }

  // enable a row's buttons if both term wrappers are ready
  enableRowIfReady(idx) {
    const container = this.containers.computations;
    if (!container) return;
    const row = container.children[idx];
    if (!row) return;
    const mc = row.querySelector('.matrix-computation');
    if (!mc) return;
    // find term wrappers inside mc
    const termWrappers = mc.querySelectorAll('.term-container');
    let allReady = true;
    termWrappers.forEach(w => {
      if (w.dataset.ready !== 'true') allReady = false;
    });
    const computeBtn = row.querySelector('button:nth-of-type(1)');
    const showBtn = row.querySelector('button:nth-of-type(2)');
    if (computeBtn && showBtn && allReady && Number(computeBtn.dataset.rowIndex) === this.nextComputeIndex) {
      computeBtn.disabled = false;
      showBtn.disabled = false;
    }
  }

  // Render a term: either a single submatrix or an op of two submatrices with a button
  renderTerm(term, termClass, onComputed) {
    const wrapper = document.createElement('div');
    wrapper.className = 'term-container';

    if (term.type === 'matrix') {
      const small = MatrixRenderer.renderSmallMatrix(term.M, term.M.length, termClass);
      const labeled = MatrixRenderer.wrapMatrixWithLabel(small, term.label, termClass);
      wrapper.appendChild(labeled);
      // mark ready and attach matrix reference
      wrapper.dataset.ready = 'true';
      wrapper.__matrix = term.M;
      // Immediately inform ready state
      if (onComputed) onComputed(term.M);
      return wrapper;
    }

    // type === 'op'
    const expr = document.createElement('div');
    expr.className = 'matrix-computation';

    const leftSmall = MatrixRenderer.renderSmallMatrix(term.left.M, term.left.M.length, termClass);
    const leftLabeled = MatrixRenderer.wrapMatrixWithLabel(leftSmall, term.left.label, termClass);
    const opNode = MatrixRenderer.createOperator(term.op === '+' ? '+' : '−');
    const rightSmall = MatrixRenderer.renderSmallMatrix(term.right.M, term.right.M.length, termClass);
    const rightLabeled = MatrixRenderer.wrapMatrixWithLabel(rightSmall, term.right.label, termClass);

    expr.appendChild(leftLabeled);
    expr.appendChild(opNode);
    expr.appendChild(rightLabeled);

    const btn = document.createElement('button');
    btn.className = 'term-compute-btn';
    btn.textContent = term.op === '+' ? 'Perform addition' : 'Perform subtraction';
    btn.addEventListener('click', () => {
      const opRes = term.op === '+'
        ? MatrixUtils.addMatrices(term.left.M, term.right.M).result
        : MatrixUtils.subtractMatrices(term.left.M, term.right.M).result;

      // mark ready and attach matrix reference so outer enable checks can see it
      wrapper.dataset.ready = 'true';
      wrapper.__matrix = opRes;

      // Replace expression with the computed term (labeled)
      wrapper.innerHTML = '';
      const computedSmall = MatrixRenderer.renderSmallMatrix(opRes, opRes.length, termClass);
      const computedLabel = term.op === '+'
        ? `(${term.left.label}+${term.right.label})`
        : `(${term.left.label}-${term.right.label})`;
      const computedWrapped = MatrixRenderer.wrapMatrixWithLabel(computedSmall, computedLabel, termClass);
      wrapper.appendChild(computedWrapped);

      if (onComputed) onComputed(opRes);
    });

    wrapper.appendChild(expr);
    wrapper.appendChild(btn);
    return wrapper;
  }

  termExpr(term) {
    if (term.type === 'matrix') return term.label;
    const sym = term.op === '+' ? '+' : '-';
    return `(${term.left.label} ${sym} ${term.right.label})`;
  }

  storeResult(key, result, resultSpan, computeBtn, showBtn) {
    // store result
    this.M[key] = result;

    // show result in the result placeholder (left side of the row)
    resultSpan.innerHTML = '';
    resultSpan.appendChild(MatrixRenderer.renderSmallMatrix(result, result.length, 'result'));

    // Remove the buttons area entirely (do not duplicate the result where buttons were)
    const controlsWrap = (computeBtn && computeBtn.parentElement) || (showBtn && showBtn.parentElement);
    if (controlsWrap) {
      controlsWrap.remove();
    }

    // mark buttons disabled (in case)
    if (computeBtn) computeBtn.disabled = true;
    if (showBtn) showBtn.disabled = true;

    if (this.containers.commentBox) {
      this.containers.commentBox.textContent = `${key} computed.`;
    }

    // advance sequential index and try enabling next row
    let rowIdx = null;
    if (computeBtn && computeBtn.dataset && computeBtn.dataset.rowIndex !== undefined) {
      rowIdx = Number(computeBtn.dataset.rowIndex);
    } else if (showBtn && showBtn.dataset && showBtn.dataset.rowIndex !== undefined) {
      rowIdx = Number(showBtn.dataset.rowIndex);
    }
    if (rowIdx !== null) {
      this.nextComputeIndex = Math.max(this.nextComputeIndex, rowIdx + 1);
      // enable next row if it's ready
      this.enableRowIfReady(this.nextComputeIndex);
    }

    this.checkCompletion();
  }

  checkCompletion() {
    if (Object.keys(this.M).length === 7) {
      this.combineResults();
    }
  }

  combineResults() {
    // compute quadrant matrices from M1..M7
    const { M1, M2, M3, M4, M5, M6, M7 } = this.M;
    const m = this.n / 2;

    const C11 = MatrixUtils.addMatrices(
      MatrixUtils.subtractMatrices(
        MatrixUtils.addMatrices(M1, M4).result,
        M5
      ).result,
      M7
    ).result;
    const C12 = MatrixUtils.addMatrices(M3, M5).result;
    const C21 = MatrixUtils.addMatrices(M2, M4).result;
    const C22 = MatrixUtils.addMatrices(
      MatrixUtils.addMatrices(
        MatrixUtils.subtractMatrices(M1, M2).result,
        M3
      ).result,
      M6
    ).result;

    // store quadrants and full result (but do not render full result yet)
    this._finalQuadrants = { C11, C12, C21, C22 };
    this.finalResult = MatrixUtils.initZeroMatrix(this.n);
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m; j++) {
        this.finalResult[i][j] = C11[i][j];
        this.finalResult[i][j + m] = C12[i][j];
        this.finalResult[i + m][j] = C21[i][j];
        this.finalResult[i + m][j + m] = C22[i][j];
      }
    }

    // Show M1..M7 first and then the final quadrant formulas and result
    this.showFinalComputationsWithMs();
  }

  // New: show M1..M7 inline, then step through quadrant formulas and final render
  showFinalComputationsWithMs() {
    const container = this.containers.computations;
    if (!container) {
      MatrixRenderer.renderMatrix(this.containers.matR, this.finalResult);
      OverlayManager.hideOverlay(this.containers.matR);
      if (this.containers.commentBox) this.containers.commentBox.textContent = 'Strassen computation complete.';
      return;
    }

    container.innerHTML = '';

    // 1) Show M1..M7 inline
    const mRow = document.createElement('div');
    mRow.className = 'final-ms-row';
    const ms = ['M1','M2','M3','M4','M5','M6','M7'];
    ms.forEach(k => {
      const box = document.createElement('div');
      box.className = 'matrix-with-label';
      const small = MatrixRenderer.renderSmallMatrix(this.M[k], this.M[k].length, 'result');
      box.appendChild(small);
      const lbl = document.createElement('div');
      lbl.className = 'small-matrix-label';
      lbl.textContent = k;
      box.appendChild(lbl);
      mRow.appendChild(box);
    });
    container.appendChild(mRow);

    // 2) Prepare formula area to step through C11..C22
    const formulaWrap = document.createElement('div');
    formulaWrap.className = 'final-formulas';
    container.appendChild(formulaWrap);

    const quads = [
      { name: 'C11', mat: this._finalQuadrants.C11, formula: 'M1 + M4 - M5 + M7' },
      { name: 'C12', mat: this._finalQuadrants.C12, formula: 'M3 + M5' },
      { name: 'C21', mat: this._finalQuadrants.C21, formula: 'M2 + M4' },
      { name: 'C22', mat: this._finalQuadrants.C22, formula: 'M1 - M2 + M3 + M6' }
    ];

    const quadArea = document.createElement('div');
    quadArea.className = 'final-quad-area';
    formulaWrap.appendChild(quadArea);

    // control buttons for stepping through the 4 formulas
    const btnRow = document.createElement('div');
    btnRow.className = 'subdemo-buttons';
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next quadrant';
    const finishBtn = document.createElement('button');
    finishBtn.textContent = 'Finish and copy';
    finishBtn.style.display = 'none';
    btnRow.appendChild(nextBtn);
    btnRow.appendChild(finishBtn);
    formulaWrap.appendChild(btnRow);

    let idx = 0;
    const renderQuadFormula = (i) => {
      quadArea.innerHTML = '';
      const info = quads[i];
      // formula text
      const formulaText = document.createElement('div');
      formulaText.className = 'formula';
      formulaText.textContent = `${info.name} = ${info.formula}`;
      // matrix result
      const matrixNode = MatrixRenderer.renderSmallMatrix(info.mat, info.mat.length, 'result');
      const wrapped = MatrixRenderer.wrapMatrixWithLabel(matrixNode, info.name, 'result');

      quadArea.appendChild(formulaText);
      quadArea.appendChild(wrapped);

      if (this.containers.commentBox) {
        this.containers.commentBox.textContent = `Showing ${info.name}.`;
      }

      if (i === quads.length - 1) {
        nextBtn.style.display = 'none';
        finishBtn.style.display = 'inline-block';
      } else {
        nextBtn.style.display = 'inline-block';
        finishBtn.style.display = 'none';
      }
    };

    nextBtn.addEventListener('click', () => {
      idx = Math.min(idx + 1, quads.length - 1);
      renderQuadFormula(idx);
    });

    finishBtn.addEventListener('click', () => {
      // render full final result into main result matrix and clear computations area
      MatrixRenderer.renderMatrix(this.containers.matR, this.finalResult);
      OverlayManager.hideOverlay(this.containers.matR);
      if (this.containers.commentBox) {
        this.containers.commentBox.textContent = 'Strassen computation complete.';
      }
      // Optionally show a summary and then clear
      container.innerHTML = '';
    });

    // start by showing the first quad formula
    renderQuadFormula(0);
  }

  // Present the 4 quadrant results sequentially inside the computations pane.
  showFinalComputations() {
    const container = this.containers.computations;
    if (!container) {
      // fallback: render full result immediately
      MatrixRenderer.renderMatrix(this.containers.matR, this.finalResult);
      OverlayManager.hideOverlay(this.containers.matR);
      if (this.containers.commentBox) this.containers.commentBox.textContent = 'Strassen computation complete.';
      return;
    }

    // Clear computations and prepare final UI
    container.innerHTML = '';
    const finalWrap = document.createElement('div');
    finalWrap.className = 'final-computations';

    const title = document.createElement('div');
    title.className = 'formula';
    title.textContent = 'Final quadrants (step through):';
    finalWrap.appendChild(title);

    const quadArea = document.createElement('div');
    quadArea.className = 'final-quad-area';
    finalWrap.appendChild(quadArea);

    const btnRow = document.createElement('div');
    btnRow.className = 'subdemo-buttons';
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    const doneBtn = document.createElement('button');
    doneBtn.textContent = 'Finish';
    doneBtn.style.display = 'none';
    btnRow.appendChild(nextBtn);
    btnRow.appendChild(doneBtn);
    finalWrap.appendChild(btnRow);

    container.appendChild(finalWrap);

    const quads = ['C11', 'C12', 'C21', 'C22'];
    let idx = 0;

    const renderQuad = (i) => {
      quadArea.innerHTML = '';
      const label = document.createElement('div');
      label.className = 'formula';
      label.textContent = `${quads[i]} =`;
      const small = MatrixRenderer.renderSmallMatrix(this._finalQuadrants[quads[i]], this._finalQuadrants[quads[i]].length, 'result');
      const wrapped = MatrixRenderer.wrapMatrixWithLabel(small, quads[i], 'result');
      quadArea.appendChild(label);
      quadArea.appendChild(wrapped);

      // update comment
      if (this.containers.commentBox) {
        this.containers.commentBox.textContent = `Showing ${quads[i]}. Click Next to continue.`;
      }

      // Show finish on last
      if (i === quads.length - 1) {
        nextBtn.style.display = 'none';
        doneBtn.style.display = 'inline-block';
      } else {
        nextBtn.style.display = 'inline-block';
        doneBtn.style.display = 'none';
      }
    };

    nextBtn.addEventListener('click', () => {
      idx = Math.min(idx + 1, quads.length - 1);
      renderQuad(idx);
    });

    doneBtn.addEventListener('click', () => {
      // render full final result into the main result matrix, remove final UI
      MatrixRenderer.renderMatrix(this.containers.matR, this.finalResult);
      OverlayManager.hideOverlay(this.containers.matR);
      if (this.containers.commentBox) this.containers.commentBox.textContent = 'Strassen computation complete.';
      finalWrap.remove();
    });

    // start at first quadrant
    renderQuad(0);
  }
}

