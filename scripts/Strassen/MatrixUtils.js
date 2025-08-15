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
    let n = A.length;
    let result = MatrixUtils.initZeroMatrix(n);
    let addCount = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        result[i][j] = A[i][j] + B[i][j];
        addCount++;
      }
    }
    return { result, addCount };
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
    let addCount = 0, mulCount = 0;
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
        mulCount += 2; // Two multiplications for each 2x2 multiplication
        addCount++;    // One addition for each 2x2 multiplication
      }
    }
    
    return { result, steps, addCount, mulCount };
  }

  static dncMultiply(A, B) {
    const n = A.length;
    if (n === 1) {
      return {
        result: [[A[0][0] * B[0][0]]],
        addCount: 0,
        mulCount: 1
      };
    }
    if (n === 2) {
      const { result, addCount, mulCount } = this.multiply2x2WithSteps(A, B);
      return { result, addCount, mulCount };
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

    // Recursively multiply and accumulate operation counts
    const M1 = this.dncMultiply(A11, B11);
    const M2 = this.dncMultiply(A12, B21);
    const M3 = this.dncMultiply(A11, B12);
    const M4 = this.dncMultiply(A12, B22);
    const M5 = this.dncMultiply(A21, B11);
    const M6 = this.dncMultiply(A22, B21);
    const M7 = this.dncMultiply(A21, B12);
    const M8 = this.dncMultiply(A22, B22);

    // Add matrices and accumulate addCounts
    const add11 = this.addMatrices(M1.result, M2.result);
    const add12 = this.addMatrices(M3.result, M4.result);
    const add21 = this.addMatrices(M5.result, M6.result);
    const add22 = this.addMatrices(M7.result, M8.result);

    const C = this.initZeroMatrix(n);
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m; j++) {
        C[i][j] = add11.result[i][j];
        C[i][j+m] = add12.result[i][j];
        C[i+m][j] = add21.result[i][j];
        C[i+m][j+m] = add22.result[i][j];
      }
    }

    // Sum all operation counts
    const addCount = M1.addCount + M2.addCount + M3.addCount + M4.addCount +
                     M5.addCount + M6.addCount + M7.addCount + M8.addCount +
                     add11.addCount + add12.addCount + add21.addCount + add22.addCount;
    const mulCount = M1.mulCount + M2.mulCount + M3.mulCount + M4.mulCount +
                     M5.mulCount + M6.mulCount + M7.mulCount + M8.mulCount;

    return { result: C, addCount, mulCount };
  }

  static getQuadrantLabel(r, c, n) {
    if (n === 2) return '';
    const mid = n / 2;
    const row = r < mid ? '1' : '2';
    const col = c < mid ? '1' : '2';
    return row + col;
  }
}