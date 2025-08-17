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
    this.finalResult = MatrixUtils.initZeroMatrix(this.n);

    // Hide any old overlays first to guarantee Step 0 view
    OverlayManager.hideOverlay(this.containers.matA);
    OverlayManager.hideOverlay(this.containers.matB);
    OverlayManager.hideOverlay(this.containers.matR);

    MatrixRenderer.renderMatrix(this.containers.matA, A);
    MatrixRenderer.renderMatrix(this.containers.matB, B);
    MatrixRenderer.renderMatrix(this.containers.matR, MatrixUtils.initZeroMatrix(this.n));

    // Start at Step 0: no overlays, no computations
    this.step = 0;
    this.computationsBuilt = false;
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
      OverlayManager.hideOverlay(this.containers.matA);
      OverlayManager.hideOverlay(this.containers.matB);
      OverlayManager.hideOverlay(this.containers.matR);
      if (this.containers.computations) this.containers.computations.innerHTML = '';
      if (this.containers.commentBox) this.containers.commentBox.textContent = 'Matrices ready. Click Next to show quadrants.';
      return;
    }

    // Step 1: show overlays
    if (this.step === 1) {
      OverlayManager.showOverlay(this.containers.matA, this.n);
      OverlayManager.showOverlay(this.containers.matB, this.n);
      OverlayManager.showOverlay(this.containers.matR, this.n);
      if (this.containers.computations) this.containers.computations.innerHTML = '';
      if (this.containers.commentBox) this.containers.commentBox.textContent = 'Quadrants shown. Click Next to set up Strassen products.';
      return;
    }

    // Step 2: show computations list (build once)
    if (this.step === 2) {
      OverlayManager.showOverlay(this.containers.matA, this.n);
      OverlayManager.showOverlay(this.containers.matB, this.n);
      OverlayManager.showOverlay(this.containers.matR, this.n);
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
      { key: 'M1', left: { type: 'op', op: '+', left: { label: 'A11', M: A11 }, right: { label: 'A22', M: A22 } },
               right: { type: 'op', op: '+', left: { label: 'B11', M: B11 }, right: { label: 'B22', M: B22 } } },
      { key: 'M2', left: { type: 'op', op: '+', left: { label: 'A21', M: A21 }, right: { label: 'A22', M: A22 } },
               right: { type: 'matrix', label: 'B11', M: B11 } },
      { key: 'M3', left: { type: 'matrix', label: 'A11', M: A11 },
               right: { type: 'op', op: '-', left: { label: 'B12', M: B12 }, right: { label: 'B22', M: B22 } } },
      { key: 'M4', left: { type: 'matrix', label: 'A22', M: A22 },
               right: { type: 'op', op: '-', left: { label: 'B21', M: B21 }, right: { label: 'B11', M: B11 } } },
      { key: 'M5', left: { type: 'op', op: '+', left: { label: 'A11', M: A11 }, right: { label: 'A12', M: A12 } },
               right: { type: 'matrix', label: 'B22', M: B22 } },
      { key: 'M6', left: { type: 'op', op: '-', left: { label: 'A21', M: A21 }, right: { label: 'A11', M: A11 } },
               right: { type: 'op', op: '+', left: { label: 'B11', M: B11 }, right: { label: 'B12', M: B12 } } },
      { key: 'M7', left: { type: 'op', op: '-', left: { label: 'A12', M: A12 }, right: { label: 'A22', M: A22 } },
               right: { type: 'op', op: '+', left: { label: 'B21', M: B21 }, right: { label: 'B22', M: B22 } } }
    ];

    const container = this.containers.computations;
    if (container) {
      container.innerHTML = '';
      defs.forEach(def => this.addComputationRow(container, def));
    }
  }

  addComputationRow(container, def) {
    const row = document.createElement('div');
    row.className = 'strassen-row';

    // Inline computation layout
    const mc = document.createElement('div');
    mc.className = 'matrix-computation';

    // Track readiness of both terms
    let leftReady = false, rightReady = false;
    let leftResult = null, rightResult = null;

    const leftNode = this.renderTerm(def.left, 'term1', (res) => {
      leftResult = res; leftReady = true; updateControls();
    });
    const times = MatrixRenderer.createOperator('×');
    const rightNode = this.renderTerm(def.right, 'term2', (res) => {
      rightResult = res; rightReady = true; updateControls();
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

    // Action buttons
    const computeBtn = document.createElement('button');
    computeBtn.textContent = 'Compute';
    computeBtn.disabled = true;
    computeBtn.addEventListener('click', () => {
      const { result } = MatrixUtils.strassenMultiply(leftResult, rightResult);
      this.storeResult(def.key, result, resultSpan, computeBtn, showBtn);
    });

    const showBtn = document.createElement('button');
    showBtn.textContent = 'Show Computation';
    showBtn.disabled = true;
    showBtn.addEventListener('click', () => {
      const exprText = `${this.termExpr(def.left)} × ${this.termExpr(def.right)}`;
      SubDemoManager.showSubDemo(leftResult, rightResult, def.key, exprText, (res) => {
        this.storeResult(def.key, res, resultSpan, computeBtn, showBtn);
      });
    });

    const controlsWrap = document.createElement('div');
    controlsWrap.className = 'term-buttons';
    controlsWrap.appendChild(computeBtn);
    controlsWrap.appendChild(showBtn);

    row.appendChild(mc);
    row.appendChild(controlsWrap);
    container.appendChild(row);

    // Initialize readiness for plain terms
    if (def.left.type === 'matrix') { leftResult = def.left.M; leftReady = true; }
    if (def.right.type === 'matrix') { rightResult = def.right.M; rightReady = true; }
    updateControls();

    function updateControls() {
      const ready = leftReady && rightReady;
      computeBtn.disabled = !ready;
      showBtn.disabled = !ready;
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

      // Replace expression with the computed term (labeled as term1/term2)
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
    this.M[key] = result;
    resultSpan.innerHTML = '';
    resultSpan.appendChild(MatrixRenderer.renderSmallMatrix(result, result.length, 'result'));
    if (computeBtn) computeBtn.disabled = true;
    if (showBtn) showBtn.disabled = true;
    if (this.containers.commentBox) {
      this.containers.commentBox.textContent = `${key} computed.`;
    }
    this.checkCompletion();
  }

  checkCompletion() {
    if (Object.keys(this.M).length === 7) {
      this.combineResults();
    }
  }

  combineResults() {
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

    const C = MatrixUtils.initZeroMatrix(this.n);
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m; j++) {
        C[i][j] = C11[i][j];
        C[i][j + m] = C12[i][j];
        C[i + m][j] = C21[i][j];
        C[i + m][j + m] = C22[i][j];
      }
    }

    this.finalResult = C;
    MatrixRenderer.renderMatrix(this.containers.matR, C);
    OverlayManager.hideOverlay(this.containers.matR);
    if (this.containers.commentBox) {
      this.containers.commentBox.textContent = 'Strassen computation complete.';
    }
  }
}

