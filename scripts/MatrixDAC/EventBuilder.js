class EventBuilder {
  static buildEvents(A, B) {
    const n = A.length;
    const events = [{ type: 'init' }];
    const result = MatrixUtils.initZeroMatrix(n);

    events.push({ type: 'show_partition', size: n });

    const size = n / 2;
    const quadrants = DemoConfig.getQuadrants(size);

    // Track operation counts
    let addCount = 0, mulCount = 0;

    for (const quad of quadrants) {
      const opCounts = this.processQuadrant(A, B, quad, result, events, n);
      if (opCounts) {
        addCount += opCounts.addCount || 0;
        mulCount += opCounts.mulCount || 0;
      }
    }

    // Add counts to the done event
    events.push({ type: 'done', result, addCount, mulCount });
    return events;
  }

  static processQuadrant(A, B, quad, result, events, n) {
    const size = n / 2;
    events.push({ type: 'start_quadrant', quadrant: quad.name });

    const A1 = MatrixUtils.extractSubmatrix(A, quad.ar, quad.ac, size);
    const B1 = MatrixUtils.extractSubmatrix(B, quad.br, quad.bc, size);
    const A2 = MatrixUtils.extractSubmatrix(A, quad.ar, quad.ac + size, size);
    const B2 = MatrixUtils.extractSubmatrix(B, quad.br + size, quad.bc, size);

    let R1, R2, term1Steps = null, term2Steps = null, addCount = 0, mulCount = 0;

    if (size === 1) {
      const r1 = A1 * B1;
      const r2 = A2 * B2;
      R1 = [[r1]];
      R2 = [[r2]];
      mulCount += 2;
    } else if (size === 2) {
      const computation1 = MatrixUtils.multiply2x2WithSteps(A1, B1);
      const computation2 = MatrixUtils.multiply2x2WithSteps(A2, B2);
      R1 = computation1.result;
      R2 = computation2.result;
      term1Steps = computation1.steps;
      term2Steps = computation2.steps;
      addCount += (computation1.addCount || 0) + (computation2.addCount || 0);
      mulCount += (computation1.mulCount || 0) + (computation2.mulCount || 0);
    } else {
      const r1 = MatrixUtils.dncMultiply(A1, B1);
      const r2 = MatrixUtils.dncMultiply(A2, B2);
      R1 = r1.result;
      R2 = r2.result;
      addCount += r1.addCount + r2.addCount;
      mulCount += r1.mulCount + r2.mulCount;
    }

    const addResult = MatrixUtils.addMatrices(R1, R2);
    const final = addResult.result;
    addCount += addResult.addCount;

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

    events.push({
      type: 'copy_result',
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
      final,
      targetR: quad.rr,
      targetC: quad.rc
    });

    return { addCount, mulCount };
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