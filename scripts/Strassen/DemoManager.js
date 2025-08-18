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
    this.finalResult = null;
    this.computationsBuilt = false;
    this.nextComputeIndex = 0;

    // Hide overlays and disallow at Step 0
    OverlayManager.hideOverlay(this.containers.matA);
    OverlayManager.hideOverlay(this.containers.matB);
    OverlayManager.hideOverlay(this.containers.matR);
    this.containers.matA.dataset.overlayAllowed = 'false';
    this.containers.matB.dataset.overlayAllowed = 'false';
    this.containers.matR.dataset.overlayAllowed = 'false';

    MatrixRenderer.renderMatrix(this.containers.matA, A);
    MatrixRenderer.renderMatrix(this.containers.matB, B);
    MatrixRenderer.renderMatrix(this.containers.matR, MatrixUtils.initZeroMatrix(this.n));

    // Start at Step 0
    this.step = 0;
    this.updateStepUI();
  }

  // Navigation helpers
  prevStep() { this.setStep(this.step - 1); }
  nextStep() { this.setStep(this.step + 1); }
  setStep(s) {
    this.step = Math.max(0, Math.min(this.maxStep, s));
    this.updateStepUI();
  }

  updateStepUI() {
    if (this.buttons.prev) this.buttons.prev.disabled = this.step === 0;
    if (this.buttons.next) this.buttons.next.disabled = this.step === this.maxStep;

    // Step 0: matrices only
    if (this.step === 0) {
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
      if (this.containers.commentBox) this.containers.commentBox.innerHTML 
      = 'Compute the seven products. Do the +/- operation(s) first.<br>Then click <b>Show</b> see details or <b>Compute</b> to skip to result.';
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
    if (!container) return;
    container.classList.add('fill-and-scroll');
    container.style.maxHeight = '';
    container.style.minHeight = '';
    container.style.overflowY = '';

    container.innerHTML = '';
    this.nextComputeIndex = 0;
    defs.forEach((def, idx) => this.addComputationRow(container, def, idx));
    this.enableRowIfReady(0);
  }

  addComputationRow(container, def, idx) {
    const self = this;

    const row = document.createElement('div');
    row.className = 'strassen-row';

    const mc = document.createElement('div');
    mc.className = 'matrix-computation';

    const keyLabel = document.createElement('span');
    keyLabel.className = 'formula';
    keyLabel.textContent = `${def.key} = `;
    mc.appendChild(keyLabel);

    let leftReady = false, rightReady = false;
    let leftResult = null, rightResult = null;

    const computeBtn = document.createElement('button');
    computeBtn.textContent = 'Compute';
    computeBtn.disabled = true;
    computeBtn.dataset.rowIndex = idx;
    computeBtn.addEventListener('click', () => {
      const { result } = MatrixUtils.strassenMultiply(leftResult, rightResult);
      this.storeResult(def.key, result, resultSpan, computeBtn, showBtn);
    });

    const showBtn = document.createElement('button');
    showBtn.textContent = 'Show';
    showBtn.disabled = true;
    showBtn.dataset.rowIndex = idx;
    showBtn.addEventListener('click', () => {
      const exprText = `${this.termExpr(def.left)} × ${this.termExpr(def.right)}`;
      SubDemoManager.showSubDemo(leftResult, rightResult, def.key, exprText, (res) => {
        this.storeResult(def.key, res, resultSpan, computeBtn, showBtn);
      });
    });

    if (this.n === 2) {
      showBtn.style.display = 'none';
    }

    const leftNode = this.renderTerm(def.left, 'term1', (res) => {
      leftResult = res; leftReady = true; updateControls();
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

    const controlsWrap = document.createElement('div');
    controlsWrap.className = 'term-buttons';
    controlsWrap.appendChild(computeBtn);
    controlsWrap.appendChild(showBtn);
    mc.appendChild(controlsWrap);

    row.appendChild(mc);
    container.appendChild(row);

    updateControls();

    function updateControls() {
      const ready = leftReady && rightReady;
      const allowedBySequence = idx === self.nextComputeIndex;
      computeBtn.disabled = !(ready && allowedBySequence);
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
    const termWrappers = mc.querySelectorAll('.term-container');
    let allReady = true;
    termWrappers.forEach(w => { if (w.dataset.ready !== 'true') allReady = false; });
    const computeBtn = row.querySelector('button:nth-of-type(1)');
    const showBtn = row.querySelector('button:nth-of-type(2)');
    if (computeBtn && allReady && Number(computeBtn.dataset.rowIndex) === this.nextComputeIndex) {
      computeBtn.disabled = false;
      if (showBtn && showBtn.style.display !== 'none') showBtn.disabled = false;
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
      wrapper.dataset.ready = 'true';
      wrapper.__matrix = term.M;
      if (onComputed) onComputed(term.M);
      return wrapper;
    }

    // term.type === 'op'
    const expr = document.createElement('div');
    expr.className = 'matrix-computation';
    expr.classList.add('paren-wrap');

    const leftSmall = MatrixRenderer.renderSmallMatrix(term.left.M, term.left.M.length, termClass);
    const leftLabeled = MatrixRenderer.wrapMatrixWithLabel(leftSmall, term.left.label, termClass);
    const rightSmall = MatrixRenderer.renderSmallMatrix(term.right.M, term.right.M.length, termClass);
    const rightLabeled = MatrixRenderer.wrapMatrixWithLabel(rightSmall, term.right.label, termClass);

    const opBtn = document.createElement('button');
    opBtn.className = 'op-btn';
    opBtn.type = 'button';
    opBtn.textContent = term.op === '+' ? '+' : '−';

    opBtn.addEventListener('click', () => {
      const opRes = term.op === '+'
        ? MatrixUtils.addMatrices(term.left.M, term.right.M).result
        : MatrixUtils.subtractMatrices(term.left.M, term.right.M).result;

      wrapper.dataset.ready = 'true';
      wrapper.__matrix = opRes;

      wrapper.innerHTML = '';
      const computedSmall = MatrixRenderer.renderSmallMatrix(opRes, opRes.length, termClass);
      const computedLabel = term.op === '+'
        ? `(${term.left.label}+${term.right.label})`
        : `(${term.left.label}-${term.right.label})`;
      const computedWrapped = MatrixRenderer.wrapMatrixWithLabel(computedSmall, computedLabel, termClass);
      wrapper.appendChild(computedWrapped);

      if (onComputed) onComputed(opRes);
    });

    expr.appendChild(leftLabeled);
    expr.appendChild(opBtn);
    expr.appendChild(rightLabeled);

    wrapper.appendChild(expr);
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

    const controlsWrap = (computeBtn && computeBtn.parentElement) || (showBtn && showBtn.parentElement);
    if (controlsWrap) controlsWrap.remove();

    if (computeBtn) computeBtn.disabled = true;
    if (showBtn) showBtn.disabled = true;

    if (this.containers.commentBox) {
      this.containers.commentBox.textContent = `${key} computed.`;
    }

    let rowIdx = null;
    if (computeBtn && computeBtn.dataset && computeBtn.dataset.rowIndex !== undefined) {
      rowIdx = Number(computeBtn.dataset.rowIndex);
    } else if (showBtn && showBtn.dataset && showBtn.dataset.rowIndex !== undefined) {
      rowIdx = Number(showBtn.dataset.rowIndex);
    }
    if (rowIdx !== null) {
      this.nextComputeIndex = Math.max(this.nextComputeIndex, rowIdx + 1);
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

    // Store quadrant matrices, but DO NOT copy them into finalResult yet.
    this._finalQuadrants = { C11, C12, C21, C22 };
    // Start with an all-zero result matrix; we'll copy quadrants into it one-by-one.
    this.finalResult = MatrixUtils.initZeroMatrix(this.n);

    this.showFinalComputationsWithMs();
  }

  // Show M1..M7 then step through quadrant formulas and copy each quadrant
  // into the result matrix automatically (show result, then show copy).
  showFinalComputationsWithMs() {
    const container = this.containers.computations;
    if (!container) {
      MatrixRenderer.renderMatrix(this.containers.matR, this.finalResult);
      OverlayManager.hideOverlay(this.containers.matR);
      if (this.containers.commentBox) this.containers.commentBox.textContent = 'Strassen computation complete.';
      return;
    }

    container.innerHTML = '';

    // Ensure result matrix initially rendered (empty)
    MatrixRenderer.renderMatrix(this.containers.matR, this.finalResult);

    // Row of M1..M7 (visual)
    const mRow = document.createElement('div');
    mRow.className = 'final-ms-row';
    const ms = ['M1','M2','M3','M4','M5','M6','M7'];
    ms.forEach(k => {
      const box = document.createElement('div');
      box.className = 'matrix-with-label m-box';
      const small = MatrixRenderer.renderSmallMatrix(this.M[k], this.M[k].length, 'result');
      box.appendChild(small);
      const lbl = document.createElement('div');
      lbl.className = 'small-matrix-label';
      lbl.textContent = k;
      box.appendChild(lbl);
      mRow.appendChild(box);
    });
    container.appendChild(mRow);

    const m = this.n / 2;
    const quads = [
      { name: 'C11', mat: this._finalQuadrants.C11, rr: 0, rc: 0, tokens: ['M1','+','M4','-','M5','+','M7'] },
      { name: 'C12', mat: this._finalQuadrants.C12, rr: 0, rc: m, tokens: ['M3','+','M5'] },
      { name: 'C21', mat: this._finalQuadrants.C21, rr: m, rc: 0, tokens: ['M2','+','M4'] },
      { name: 'C22', mat: this._finalQuadrants.C22, rr: m, rc: m, tokens: ['M1','-','M2','+','M3','+','M6'] }
    ];

    const formulaWrap = document.createElement('div');
    formulaWrap.className = 'final-formulas';
    container.appendChild(formulaWrap);

    const quadArea = document.createElement('div');
    quadArea.className = 'final-quad-area';
    formulaWrap.appendChild(quadArea);

    const btnRow = document.createElement('div');
    btnRow.className = 'subdemo-buttons';
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next quadrant';
    const finishBtn = document.createElement('button');
    finishBtn.textContent = 'Finish';
    finishBtn.style.display = 'none';
    btnRow.appendChild(nextBtn);
    btnRow.appendChild(finishBtn);
    formulaWrap.appendChild(btnRow);

    let idx = 0;
    const copied = [false, false, false, false];

    const renderQuadFormula = (i) => {
      quadArea.innerHTML = '';
      const info = quads[i];

      // Title / formula text
      const formulaText = document.createElement('div');
      formulaText.className = 'formula';
      formulaText.textContent = `${info.name} = ${info.tokens.join(' ')}`;
      quadArea.appendChild(formulaText);

      // Build the sequence: Mx (+|-) My ... = Result
      const seq = document.createElement('div');
      seq.className = 'matrix-computation';
      seq.style.display = 'flex';
      seq.style.alignItems = 'center';
      seq.style.gap = '0.5em';

      const opNode = (sym) => {
        const span = document.createElement('span');
        span.textContent = sym;
        span.style.fontWeight = 'bold';
        span.style.fontSize = '1.1em';
        return span;
      };

      let expectedOp = '+';
      for (let t = 0; t < info.tokens.length; t++) {
        const token = info.tokens[t];
        if (token === '+' || token === '-') {
          seq.appendChild(opNode(token));
          expectedOp = token;
          continue;
        }
        const mKey = token;
        const mMat = this.M[mKey];
        const small = MatrixRenderer.renderSmallMatrix(mMat, mMat.length, 'result');
        const wrapped = MatrixRenderer.wrapMatrixWithLabel(small, mKey, 'result');

        wrapped.classList.add('m-box');
        if (expectedOp === '+') wrapped.classList.add('used-add');
        else wrapped.classList.add('used-sub');

        seq.appendChild(wrapped);
        expectedOp = '+';
      }

      seq.appendChild(opNode('='));

      const quadrantSmall = MatrixRenderer.renderSmallMatrix(info.mat, info.mat.length, 'result');
      const quadrantWrapped = MatrixRenderer.wrapMatrixWithLabel(quadrantSmall, info.name, 'result');
      seq.appendChild(quadrantWrapped);

      quadArea.appendChild(seq);

      // Until the automatic copy completes, disallow Next
      nextBtn.disabled = true;

      if (this.containers.commentBox) {
        this.containers.commentBox.textContent = `Showing ${info.name}. Copying into result...`;
      }

      // schedule automatic copy after a short delay so user sees the quadrant first
      const copyDelay = Math.max(200, Math.floor(DemoConfig.ANIMATION_DURATION / 2));
      setTimeout(() => {
        // copy quadrant values into finalResult at (rr, rc)
        const size = info.mat.length;
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            this.finalResult[info.rr + r][info.rc + c] = info.mat[r][c];
          }
        }

        // render with highlight
        MatrixRenderer.renderMatrix(this.containers.matR, this.finalResult, { highlightRegion: { r: info.rr, c: info.rc, size } });

        copied[i] = true;
        // allow user to proceed after highlight
        nextBtn.disabled = false;

        if (this.containers.commentBox) {
          this.containers.commentBox.textContent = `${info.name} copied into result.`;
        }

        // remove highlight after animation duration
        setTimeout(() => {
          MatrixRenderer.renderMatrix(this.containers.matR, this.finalResult);
        }, DemoConfig.ANIMATION_DURATION + 100);
      }, copyDelay);

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
      // ensure any remaining quadrants are copied (should already be done by auto-copy)
      quads.forEach((info, k) => {
        if (!copied[k]) {
          const size = info.mat.length;
          for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
              this.finalResult[info.rr + r][info.rc + c] = info.mat[r][c];
            }
          }
        }
      });
      MatrixRenderer.renderMatrix(this.containers.matR, this.finalResult);
      OverlayManager.hideOverlay(this.containers.matR);
      if (this.containers.commentBox) {
        this.containers.commentBox.textContent = 'Strassen computation complete.';
      }
      container.innerHTML = '';
    });

    // start with first quadrant
    renderQuadFormula(0);
  }

  // Alternate final-view flow (kept for compatibility)
  showFinalComputations() {
    const container = this.containers.computations;
    if (!container) {
      MatrixRenderer.renderMatrix(this.containers.matR, this.finalResult);
      OverlayManager.hideOverlay(this.containers.matR);
      if (this.containers.commentBox) this.containers.commentBox.textContent = 'Strassen computation complete.';
      return;
    }

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

      if (this.containers.commentBox) {
        this.containers.commentBox.textContent = `Showing ${quads[i]}. Click Next to continue.`;
      }

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
      MatrixRenderer.renderMatrix(this.containers.matR, this.finalResult);
      OverlayManager.hideOverlay(this.containers.matR);
      if (this.containers.commentBox) this.containers.commentBox.textContent = 'Strassen computation complete.';
      finalWrap.remove();
    });

    renderQuad(0);
  }
}