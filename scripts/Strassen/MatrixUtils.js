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
      // Always return a 1×1 matrix so downstream operations can
      // treat submatrices uniformly without checking for scalars.
      return [[M[r][c]]];
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

  static subtractMatrices(A, B) {
    let n = A.length;
    let result = MatrixUtils.initZeroMatrix(n);
    let addCount = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        result[i][j] = A[i][j] - B[i][j];
        addCount++;
      }
    }
    return { result, addCount };
  }

  static multiply2x2(A, B) {
    // Gracefully handle scalar-like inputs: number | [x] | [[x]]
    const getScalar = (X) => {
      if (typeof X === 'number') return X;
      if (Array.isArray(X)) {
        if (Array.isArray(X[0])) return X[0][0];
        return X[0];
      }
      return Number(X);
    };
    if ((typeof A === 'number' || (Array.isArray(A) && A.length === 1)) &&
        (typeof B === 'number' || (Array.isArray(B) && B.length === 1))) {
      return getScalar(A) * getScalar(B);
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

  static strassenMultiply(A, B) {
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

    const S1 = this.addMatrices(A11, A22);
    const S2 = this.addMatrices(B11, B22);
    const S3 = this.addMatrices(A21, A22);
    const S4 = this.subtractMatrices(B12, B22);
    const S5 = this.subtractMatrices(B21, B11);
    const S6 = this.addMatrices(A11, A12);
    const S7 = this.subtractMatrices(A21, A11);
    const S8 = this.addMatrices(B11, B12);
    const S9 = this.subtractMatrices(A12, A22);
    const S10 = this.addMatrices(B21, B22);

    const M1 = this.strassenMultiply(S1.result, S2.result);
    const M2 = this.strassenMultiply(S3.result, B11);
    const M3 = this.strassenMultiply(A11, S4.result);
    const M4 = this.strassenMultiply(A22, S5.result);
    const M5 = this.strassenMultiply(S6.result, B22);
    const M6 = this.strassenMultiply(S7.result, S8.result);
    const M7 = this.strassenMultiply(S9.result, S10.result);

    const C11 = this.addMatrices(
      this.subtractMatrices(
        this.addMatrices(M1.result, M4.result).result,
        M5.result
      ).result,
      M7.result
    );
    const C12 = this.addMatrices(M3.result, M5.result);
    const C21 = this.addMatrices(M2.result, M4.result);
    const C22 = this.addMatrices(
      this.addMatrices(
        this.subtractMatrices(M1.result, M2.result).result,
        M3.result
      ).result,
      M6.result
    );

    const C = this.initZeroMatrix(n);
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m; j++) {
        C[i][j] = C11.result[i][j];
        C[i][j + m] = C12.result[i][j];
        C[i + m][j] = C21.result[i][j];
        C[i + m][j + m] = C22.result[i][j];
      }
    }

    const addCount =
      S1.addCount + S2.addCount + S3.addCount + S4.addCount + S5.addCount +
      S6.addCount + S7.addCount + S8.addCount + S9.addCount + S10.addCount +
      M1.addCount + M2.addCount + M3.addCount + M4.addCount +
      M5.addCount + M6.addCount + M7.addCount +
      C11.addCount + C12.addCount + C21.addCount + C22.addCount;
    const mulCount =
      M1.mulCount + M2.mulCount + M3.mulCount + M4.mulCount +
      M5.mulCount + M6.mulCount + M7.mulCount;

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