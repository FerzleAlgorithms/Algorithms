class MatrixUtils {
  static randInt(max) {
    return Math.floor(Math.random() * max);
  }

  static genRandomMatrix(n) {
    return Array.from({length: n}, () => 
      Array.from({length: n}, () => this.randInt(10))
    );
  }

  static initZeroMatrix(n) {
    return Array.from({length: n}, () => Array(n).fill(0));
  }

  static extractSubmatrix(M, r, c, size) {
    if (size === 1) {
      return M[r][c];
    }
    
    const sub = [];
    for (let i = 0; i < size; i++) {
      sub[i] = [];
      for (let j = 0; j < size; j++) {
        sub[i][j] = M[r + i][c + j];
      }
    }
    return sub;
  }

  static addMatrices(A, B) {
    if (typeof A === 'number' || (Array.isArray(A) && A.length === 1 && typeof A[0] === 'number')) {
      const aVal = typeof A === 'number' ? A : A[0];
      const bVal = typeof B === 'number' ? B : B[0];
      return aVal + bVal;
    }
    
    const result = [];
    for (let i = 0; i < A.length; i++) {
      result[i] = [];
      for (let j = 0; j < A[0].length; j++) {
        result[i][j] = A[i][j] + B[i][j];
      }
    }
    return result;
  }

  static multiply2x2(A, B) {
    if (typeof A === 'number' || (Array.isArray(A) && A.length === 1 && typeof A[0] === 'number')) {
      const aVal = typeof A === 'number' ? A : A[0];
      const bVal = typeof B === 'number' ? B : B[0];
      return aVal * bVal;
    }
    
    const result = [[0,0],[0,0]];
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        for (let k = 0; k < 2; k++) {
          result[i][j] += A[i][k] * B[k][j];
        }
      }
    }
    return result;
  }

  static multiply2x2WithSteps(A, B) {
    const steps = [];
    const result = [[0,0],[0,0]];
    
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        const computation = {
          position: [i, j],
          formula: `(${A[i][0]} × ${B[0][j]}) + (${A[i][1]} × ${B[1][j]})`,
          calculation: `${A[i][0] * B[0][j]} + ${A[i][1] * B[1][j]}`,
          result: A[i][0] * B[0][j] + A[i][1] * B[1][j]
        };
        steps.push(computation);
        result[i][j] = computation.result;
      }
    }
    
    return { result, steps };
  }

  static dncMultiply(A, B) {
    const n = A.length;
    if (n === 1) {
      return A[0][0] * B[0][0];
    }
    if (n === 2) {
      return this.multiply2x2(A, B);
    }
    
    const m = n >> 1;

    const A11 = this.extractSubmatrix(A, 0, 0, m);
    const A12 = this.extractSubmatrix(A, 0, m, m);
    const A21 = this.extractSubmatrix(A, m, 0, m);
    const A22 = this.extractSubmatrix(A, m, m, m);

    const B11 = this.extractSubmatrix(B, 0, 0, m);
    const B12 = this.extractSubmatrix(B, 0, m, m);
    const B21 = this.extractSubmatrix(B, m, 0, m);
    const B22 = this.extractSubmatrix(B, m, m, m);

    const C11 = this.addMatrices(this.dncMultiply1D(A11, B11), this.dncMultiply1D(A12, B21));
    const C12 = this.addMatrices(this.dncMultiply1D(A11, B12), this.dncMultiply1D(A12, B22));
    const C21 = this.addMatrices(this.dncMultiply1D(A21, B11), this.dncMultiply1D(A22, B21));
    const C22 = this.addMatrices(this.dncMultiply1D(A21, B12), this.dncMultiply1D(A22, B22));

    const C = this.initZeroMatrix(n);
    
    if (m === 1) {
      C[0][0] = C11;
      C[0][1] = C12;
      C[1][0] = C21;
      C[1][1] = C22;
    } else {
      for (let i = 0; i < m; i++) {
        for (let j = 0; j < m; j++) {
          C[i][j] = C11[i][j];
          C[i][j+m] = C12[i][j];
          C[i+m][j] = C21[i][j];
          C[i+m][j+m] = C22[i][j];
        }
      }
    }
    return C;
  }

  static dncMultiply1D(A, B) {
    if (typeof A === 'number' && typeof B === 'number') {
      return A * B;
    } else if (Array.isArray(A) && Array.isArray(B)) {
      if (A.length === 1) {
        return A[0][0] * B[0][0];
      } else if (A.length === 2) {
        return this.multiply2x2(A, B);
      } else {
        return this.dncMultiply(A, B);
      }
    }
    return 0;
  }

  static getQuadrantLabel(r, c, n) {
    if (n === 2) return '';
    const mid = n / 2;
    const row = r < mid ? '1' : '2';
    const col = c < mid ? '1' : '2';
    return row + col;
  }
}