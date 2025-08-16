class DemoManager {
  constructor(containers, buttons = {}) {
    this.containers = containers;
    this.buttons = buttons;
    this.A = [];
    this.B = [];
    this.M = {};
    this.finalResult = null;

    if (this.buttons.generate) {
      this.buttons.generate.addEventListener('click', () => this.generateNewDemo());
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

    MatrixRenderer.renderMatrix(this.containers.matA, A);
    MatrixRenderer.renderMatrix(this.containers.matB, B);
    MatrixRenderer.renderMatrix(this.containers.matR, MatrixUtils.initZeroMatrix(this.n));
    OverlayManager.showOverlay(this.containers.matA, this.n);
    OverlayManager.showOverlay(this.containers.matB, this.n);
    OverlayManager.showOverlay(this.containers.matR, this.n);

    if (this.containers.commentBox) {
      this.containers.commentBox.textContent = 'Compute the seven products.';
    }

    this.buildComputationList();
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
      { key: 'M1', expr: '(A11 + A22) × (B11 + B22)', a: MatrixUtils.addMatrices(A11, A22).result, b: MatrixUtils.addMatrices(B11, B22).result },
      { key: 'M2', expr: '(A21 + A22) × B11',          a: MatrixUtils.addMatrices(A21, A22).result, b: B11 },
      { key: 'M3', expr: 'A11 × (B12 - B22)',          a: A11, b: MatrixUtils.subtractMatrices(B12, B22).result },
      { key: 'M4', expr: 'A22 × (B21 - B11)',          a: A22, b: MatrixUtils.subtractMatrices(B21, B11).result },
      { key: 'M5', expr: '(A11 + A12) × B22',          a: MatrixUtils.addMatrices(A11, A12).result, b: B22 },
      { key: 'M6', expr: '(A21 - A11) × (B11 + B12)',  a: MatrixUtils.subtractMatrices(A21, A11).result, b: MatrixUtils.addMatrices(B11, B12).result },
      { key: 'M7', expr: '(A12 - A22) × (B21 + B22)',  a: MatrixUtils.subtractMatrices(A12, A22).result, b: MatrixUtils.addMatrices(B21, B22).result }
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

    const formula = document.createElement('span');
    formula.className = 'formula';
    formula.textContent = `${def.key} = ${def.expr} = `;
    row.appendChild(formula);

    const resultSpan = document.createElement('span');
    resultSpan.className = 'result';
    row.appendChild(resultSpan);

    const computeBtn = document.createElement('button');
    computeBtn.textContent = 'Compute';
    computeBtn.addEventListener('click', () => {
      const { result } = MatrixUtils.strassenMultiply(def.a, def.b);
      this.storeResult(def.key, result, resultSpan, computeBtn, showBtn);
    });

    const showBtn = document.createElement('button');
    showBtn.textContent = 'Show Computation';
    showBtn.addEventListener('click', () => {
      SubDemoManager.showSubDemo(def.a, def.b, def.key, def.expr, (res) => {
        this.storeResult(def.key, res, resultSpan, computeBtn, showBtn);
      });
    });

    row.appendChild(computeBtn);
    row.appendChild(showBtn);

    container.appendChild(row);
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

