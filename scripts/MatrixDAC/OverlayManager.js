class OverlayManager {
  static showOverlay(container, size, options = {}) {
    this.hideOverlay(container);
    
    const overlay = document.createElement('div');
    overlay.className = 'matrix-overlay';
    overlay.style.gridTemplateColumns = '1fr 1fr';
    overlay.style.gridTemplateRows = '1fr 1fr';

    const prefix = this.getMatrixPrefix(container);
    const labels = DemoConfig.QUADRANT_LABELS;
    
    labels.forEach(label => {
      const div = this.createOverlayLabel(prefix, label, options);
      overlay.appendChild(div);
    });
    
    container.appendChild(overlay);
    
    if (window.MathJax) {
      MathJax.typesetPromise([overlay]).catch(err => console.log('MathJax error:', err));
    }
  }

  static createOverlayLabel(prefix, label, options) {
    const div = document.createElement('div');
    div.className = 'overlay-label';
    
    const quadrantName = prefix + label;
    
    this.applyTermColors(div, quadrantName, options.termColors);
    this.applyActiveState(div, quadrantName, options.activeQuadrant);
    this.setLabelContent(div, prefix, label);
    
    return div;
  }

  static applyTermColors(div, quadrantName, termColors) {
    if (!termColors) return;
    
    if (termColors.term1 && termColors.term1.includes(quadrantName)) {
      div.classList.add('term1');
    } else if (termColors.term2 && termColors.term2.includes(quadrantName)) {
      div.classList.add('term2');
    }
  }

  static applyActiveState(div, quadrantName, activeQuadrant) {
    if (activeQuadrant && quadrantName === activeQuadrant) {
      div.classList.add('active');
    }
  }

  static setLabelContent(div, prefix, label) {
    if (window.MathJax) {
      div.innerHTML = `\\(${prefix}_{${label}}\\)`;
    } else {
      div.textContent = prefix + label;
    }
  }

  static getMatrixPrefix(container) {
    const prefixMap = {
      'matrix-a': 'A',
      'sub-matrix-a': 'A',
      'demo-matrix-a': 'A',
      'matrix-b': 'B',
      'sub-matrix-b': 'B',
      'demo-matrix-b': 'B'
    };
    
    return prefixMap[container.id] || 'C';
  }

  static hideOverlay(container) {
    const existing = container.querySelector('.matrix-overlay');
    if (existing) existing.remove();
  }
}