class MatrixRenderer {
  static renderMatrix(container, matrix, options = {}) {
    container.innerHTML = '';
    const n = matrix.length;
    container.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const cell = this.createMatrixCell(matrix[i][j], i, j, options);
        container.appendChild(cell);
      }
    }
  }

  static createMatrixCell(value, row, col, options) {
    const cell = document.createElement('div');
    cell.className = 'matrix-element';
    cell.textContent = value;
    
    if (options.highlightRegion && this.isInRegion(row, col, options.highlightRegion)) {
      cell.classList.add('copied-highlight');
    }
    
    return cell;
  }

  static renderSmallMatrix(matrix, size, termClass = null) {
    const container = document.createElement('div');
    container.className = 'small-matrix';
    if (termClass) container.classList.add(termClass);
    
    const cellSize = DemoConfig.SMALL_MATRIX_CELL_SIZE;
    container.style.gridTemplateColumns = `repeat(${size}, ${cellSize}px)`;
    container.style.gridAutoRows = `${cellSize}px`;

    if (size === 1) {
      this.addScalarCell(container, matrix);
    } else {
      this.addMatrixCells(container, matrix, size);
    }
    
    return container;
  }

  static addScalarCell(container, matrix) {
    const cellDiv = document.createElement('div');
    cellDiv.className = 'small-matrix-element';
    cellDiv.textContent = typeof matrix === 'number' ? matrix : matrix;
    container.appendChild(cellDiv);
  }

  static addMatrixCells(container, matrix, size) {
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const cellDiv = document.createElement('div');
        cellDiv.className = 'small-matrix-element';
        cellDiv.textContent = matrix[i][j];
        container.appendChild(cellDiv);
      }
    }
  }

  static renderComputationMatrix(container, matrix) {
    container.innerHTML = '';
    container.className = 'matrix-container';
    container.style.display = 'grid';
    container.style.gridTemplateColumns = 'repeat(2, 1fr)';
    container.style.gridTemplateRows = 'repeat(2, 1fr)';
    container.style.gap = '4px';
    container.style.padding = '6px';
    container.style.border = '1px solid #999';
    container.style.borderRadius = '6px';
    
    this.applyMatrixBackground(container);
    
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        const cell = this.createComputationCell(matrix[i][j], container);
        container.appendChild(cell);
      }
    }
  }

  static createComputationCell(value, container) {
    const cell = document.createElement('div');
    cell.className = 'matrix-element';
    Object.assign(cell.style, {
      width: '30px',
      height: '30px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid #777',
      fontFamily: 'monospace',
      fontSize: '1em'
    });
    
    this.applyBackgroundToCell(cell, container);
    cell.textContent = value;
    return cell;
  }

  static applyMatrixBackground(container) {
    const backgrounds = {
      'demo-matrix-a': 'rgba(208, 231, 255, 0.3)',
      'demo-matrix-b': 'rgba(255, 208, 208, 0.3)',
      'demo-matrix-result': 'rgba(208, 255, 208, 0.3)'
    };
    container.style.background = backgrounds[container.id] || backgrounds['demo-matrix-a'];
  }

  static applyBackgroundToCell(cell, container) {
    const backgrounds = {
      'demo-matrix-a': 'rgba(208, 231, 255, 0.3)',
      'demo-matrix-b': 'rgba(255, 208, 208, 0.3)',
      'demo-matrix-result': 'rgba(208, 255, 208, 0.3)'
    };
    cell.style.background = backgrounds[container.id] || backgrounds['demo-matrix-a'];
  }

  static isInRegion(row, col, region) {
    return row >= region.r && row < region.r + region.size &&
           col >= region.c && col < region.c + region.size;
  }

  static wrapMatrixWithLabel(matrixNode, label, termClass = null) {
    const wrapper = document.createElement('div');
    wrapper.className = 'matrix-with-label';
    
    wrapper.appendChild(matrixNode);
    
    const labelDiv = document.createElement('div');
    labelDiv.className = 'small-matrix-label';
    if (termClass) labelDiv.classList.add(termClass);
    
    if (window.MathJax && /[0-9]/.test(label)) {
      const latexLabel = label.replace(/([ABC])(11|12|21|22)/g, (match, letter, subscript) => {
        return `${letter}_{${subscript}}`;
      });
      labelDiv.innerHTML = `\\(${latexLabel}\\)`;
    } else {
      labelDiv.textContent = label;
    }
    
    wrapper.appendChild(labelDiv);
    
    if (window.MathJax && labelDiv.innerHTML.includes('\\(')) {
      MathJax.typesetPromise([labelDiv]).catch(err => console.log('MathJax error:', err));
    }
    return wrapper;
  }

  static createOperator(symbol) {
    const s = document.createElement('span');
    s.textContent = symbol;
    s.style.fontWeight = 'bold';
    s.style.fontSize = '1.1em';
    return s;
  }
}