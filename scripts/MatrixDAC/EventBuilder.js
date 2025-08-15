class EventBuilder {
  static buildEvents(A, B) {
    const n = A.length;
    const events = [{ type: 'init' }];
    const result = MatrixUtils.initZeroMatrix(n);
    
    events.push({ type: 'show_partition', size: n });

    const size = n / 2;
    const quadrants = DemoConfig.getQuadrants(size);

    for (const quad of quadrants) {
      this.processQuadrant(A, B, quad, result, events, n);
    }

    events.push({ type: 'done', result });
    return events;
  }

  static processQuadrant(A, B, quad, result, events, n) {
    const size = n / 2;
    events.push({ type: 'start_quadrant', quadrant: quad.name });

    const A1 = MatrixUtils.extractSubmatrix(A, quad.ar, quad.ac, size);
    const B1 = MatrixUtils.extractSubmatrix(B, quad.br, quad.bc, size);
    
    const A2 = MatrixUtils.extractSubmatrix(A, quad.ar, quad.ac + size, size);
    const B2 = MatrixUtils.extractSubmatrix(B, quad.br + size, quad.bc, size);

    let R1, R2;
    let term1Steps = null, term2Steps = null;
    
    if (size === 1) {
      R1 = A1 * B1;
      R2 = A2 * B2;
    } else if (size === 2) {
      const computation1 = MatrixUtils.multiply2x2WithSteps(A1, B1);
      const computation2 = MatrixUtils.multiply2x2WithSteps(A2, B2);
      R1 = computation1.result;
      R2 = computation2.result;
      term1Steps = computation1.steps;
      term2Steps = computation2.steps;
    } else {
      R1 = MatrixUtils.dncMultiply(A1, B1);
      R2 = MatrixUtils.dncMultiply(A2, B2);
    }
    
    const final = MatrixUtils.addMatrices(R1, R2);

    events.push({
      type: 'show_interactive_computation',
      quadrant: quad.name,
      term1: {
        matrixA: A1,
        matrixB: B1,
        result: R1,
        steps: term1Steps,
        description: `A${MatrixUtils.getQuadrantLabel(quad.ar, quad.ac, n)} × B${MatrixUtils.getQuadrantLabel(quad.br, quad.bc, n)}`
      },
      term2: {
        matrixA: A2,
        matrixB: B2,
        result: R2,
        steps: term2Steps,
        description: `A${MatrixUtils.getQuadrantLabel(quad.ar, quad.ac + size, n)} × B${MatrixUtils.getQuadrantLabel(quad.br + size, quad.bc, n)}`
      },
      final
    });

    this.copyResultToMatrix(quad, final, result, size);
    events.push({ type: 'copy_result', quadrant: quad.name, final, targetR: quad.rr, targetC: quad.rc });
  }

  static copyResultToMatrix(quad, final, result, size) {
    if (size === 1) {
      result[quad.rr][quad.rc] = final;
    } else {
      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          result[quad.rr + i][quad.rc + j] = final[i][j];
        }
      }
    }
  }
}