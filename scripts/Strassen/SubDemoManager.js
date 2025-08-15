class SubDemoManager {
  static showSubDemo(termData, parentQuadrant, termLabel, onComplete) {
    if (termData.matrixA.length === 2 && termData.matrixB.length === 2) {
      this.show2x2Demo(termData, parentQuadrant, termLabel, onComplete);
    } else {
      this.showRecursiveSubDemo(termData, parentQuadrant, termLabel, onComplete);
    }
  }

  static show2x2Demo(termData, parentQuadrant, termLabel, onComplete) {
    const overlay = document.createElement('div');
    overlay.className = 'demo-overlay';
    // Ensure overlay is always on top
    overlay.style.zIndex = SubDemoManager.getNextOverlayZIndex();

    const computation = MatrixUtils.multiply2x2WithSteps(termData.matrixA, termData.matrixB);

    overlay.innerHTML = this.create2x2DemoHTML(termLabel, parentQuadrant, termData.description);
    document.body.appendChild(overlay);

    this.initialize2x2Demo(overlay, termData, computation, onComplete);
  }

  static create2x2DemoHTML(termLabel, parentQuadrant, description) {
    return `
      <button class="close-overlay">Close & Compute</button>
      <div class="demo-container">
        <div class="overlay-title">Computing ${termLabel} for ${parentQuadrant}: ${description}</div>
        
        <div class="overlay-controls">
          <div class="step-controls">
            <button id="step-prev-btn" disabled>Previous</button>
            <button id="step-next-btn">Next</button>
            <button id="complete-btn" style="display:none;">Complete</button>
          </div>
        </div><br>
        
        <div class="step-by-step-computation">
          <div id="matrices-display" style="display: flex; justify-content: center; align-items: center; gap: 1em; margin-bottom: 1em;">
            <div class="matrix-panel">
              <div id="demo-matrix-a" class="matrix-container"></div>
              <div class="matrix-label">A</div>
            </div>
            <div class="matrix-op">×</div>
            <div class="matrix-panel">
              <div id="demo-matrix-b" class="matrix-container"></div>
              <div class="matrix-label">B</div>
            </div>
            <div class="matrix-op">=</div>
            <div class="matrix-panel">
              <div id="demo-matrix-result" class="matrix-container"></div>
              <div class="matrix-label">Result</div>
            </div>
          </div>
          
          <div class="computation-steps" id="computation-steps"></div>
        </div>
      </div>
    `;
  }

  static initialize2x2Demo(overlay, termData, computation, onComplete) {
    let currentStep = -1;
    const steps = computation.steps;
    
    MatrixRenderer.renderComputationMatrix(overlay.querySelector('#demo-matrix-a'), termData.matrixA);
    MatrixRenderer.renderComputationMatrix(overlay.querySelector('#demo-matrix-b'), termData.matrixB);
    MatrixRenderer.renderComputationMatrix(overlay.querySelector('#demo-matrix-result'), [[0,0],[0,0]]);
    
    const stepPrevBtn = overlay.querySelector('#step-prev-btn');
    const stepNextBtn = overlay.querySelector('#step-next-btn');
    const completeBtn = overlay.querySelector('#complete-btn');
    const stepsContainer = overlay.querySelector('#computation-steps');

    const updateStep = () => this.update2x2Step(overlay, currentStep, steps, stepsContainer, stepPrevBtn, stepNextBtn, completeBtn, termData.matrixA, termData.matrixB);

    stepNextBtn.addEventListener('click', () => {
      if (currentStep < steps.length - 1) {
        currentStep++;
        updateStep();
      }
    });

    stepPrevBtn.addEventListener('click', () => {
      if (currentStep > -1) {
        currentStep--;
        updateStep();
      }
    });

    completeBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
      onComplete();
    });

    overlay.querySelector('.close-overlay').addEventListener('click', () => {
      document.body.removeChild(overlay);
      onComplete();
    });

    updateStep();
  }

  static update2x2Step(overlay, currentStep, steps, stepsContainer, stepPrevBtn, stepNextBtn, completeBtn, A, B) {
    // Reset all cell styles
    overlay.querySelectorAll('.matrix-element').forEach(el => {
      el.classList.remove('highlight-element');
      const container = el.closest('.matrix-container');
      this.resetCellStyle(el, container);
    });
    
    if (currentStep >= 0 && currentStep < steps.length) {
      const step = steps[currentStep];
      this.highlightStepElements(overlay, step, A, B);
      this.updateStepsContainer(stepsContainer, step, A, B);
    } else {
      stepsContainer.innerHTML = '<p>Click "Next" to start the step-by-step computation</p>';
    }
    
    this.updateStepButtons(stepPrevBtn, stepNextBtn, completeBtn, currentStep, steps.length);
  }

  static resetCellStyle(cell, container) {
    const backgrounds = {
      'demo-matrix-a': 'rgba(208, 231, 255, 0.3)',
      'demo-matrix-b': 'rgba(255, 208, 208, 0.3)',
      'demo-matrix-result': 'rgba(208, 255, 208, 0.3)'
    };
    cell.style.background = backgrounds[container.id] || backgrounds['demo-matrix-a'];
    cell.style.border = '1px solid #777';
  }

  static highlightStepElements(overlay, step, A, B) {
    const [i, j] = step.position;
    
    // Update result cell
    const resultMatrix = overlay.querySelector('#demo-matrix-result');
    const resultCells = resultMatrix.querySelectorAll('.matrix-element');
    resultCells[i * 2 + j].textContent = step.result;
    resultCells[i * 2 + j].style.background = 'rgba(255, 165, 0, 0.8)';
    resultCells[i * 2 + j].style.border = '2px solid #ff6600';
    
    // Highlight multiplication pairs
    const matrixA = overlay.querySelector('#demo-matrix-a');
    const matrixB = overlay.querySelector('#demo-matrix-b');
    const aCells = matrixA.querySelectorAll('.matrix-element');
    const bCells = matrixB.querySelectorAll('.matrix-element');
    
    // First pair: A[i,0] and B[0,j] - YELLOW
    aCells[i * 2 + 0].style.background = 'rgba(255, 235, 59, 0.8)';
    aCells[i * 2 + 0].style.border = '2px solid #ffeb3b';
    bCells[0 * 2 + j].style.background = 'rgba(255, 235, 59, 0.8)';
    bCells[0 * 2 + j].style.border = '2px solid #ffeb3b';
    
    // Second pair: A[i,1] and B[1,j] - BLUE
    aCells[i * 2 + 1].style.background = 'rgba(33, 150, 243, 0.8)';
    aCells[i * 2 + 1].style.border = '2px solid #0277bd';
    bCells[1 * 2 + j].style.background = 'rgba(33, 150, 243, 0.8)';
    bCells[1 * 2 + j].style.border = '2px solid #0277bd';
  }

  static updateStepsContainer(stepsContainer, step, A, B) {
    const [i, j] = step.position;
    stepsContainer.innerHTML = `
      <div class="current-computation">
        <h4>Computing element [${i+1}, ${j+1}]:</h4>
        <div class="formula">(<span style="color: #ffeb3b; font-weight: bold;">${A[i][0]} × ${B[0][j]}</span>) + (<span style="color: #0277bd; font-weight: bold;">${A[i][1]} × ${B[1][j]}</span>)</div>
        <div class="calculation">= <span style="color: #ffeb3b; font-weight: bold;">${A[i][0] * B[0][j]}</span> + <span style="color: #0277bd; font-weight: bold;">${A[i][1] * B[1][j]}</span></div>
        <div class="result">= ${step.result}</div>
      </div>
    `;
  }

  static updateStepButtons(stepPrevBtn, stepNextBtn, completeBtn, currentStep, stepsLength) {
    stepPrevBtn.disabled = currentStep <= -1;
    stepNextBtn.disabled = currentStep >= stepsLength - 1;
    
    if (currentStep >= stepsLength - 1) {
      stepNextBtn.style.display = 'none';
      completeBtn.style.display = 'inline-block';
    } else {
      stepNextBtn.style.display = 'inline-block';
      completeBtn.style.display = 'none';
    }
  }

  static showRecursiveSubDemo(termData, parentQuadrant, termLabel, onComplete) {
    const overlay = document.createElement('div');
    overlay.className = 'demo-overlay';
    // Ensure overlay is always on top
    overlay.style.zIndex = SubDemoManager.getNextOverlayZIndex();

    overlay.innerHTML = this.createRecursiveDemoHTML(termLabel, parentQuadrant, termData.description);
    document.body.appendChild(overlay);

    this.initializeRecursiveSubDemo(overlay, termData.matrixA, termData.matrixB, onComplete, overlay);

    overlay.querySelector('.close-overlay').addEventListener('click', () => {
      document.body.removeChild(overlay);
      onComplete();
    });
  }

  static createRecursiveDemoHTML(termLabel, parentQuadrant, description) {
    return `
      <button class="close-overlay">Close & Compute</button>
      <div class="demo-container">
        <div class="overlay-title">Computing ${termLabel} for ${parentQuadrant}: ${description}</div>
        
        <div class="overlay-controls">
          <div class="step-controls">
            <button id="sub-prev-btn" disabled>Previous</button>
            <button id="sub-next-btn" disabled>Next</button>
          </div>
        </div><br>
        
        <div id="sub-matrix-row">
          <div class="matrix-panel">
            <div id="sub-matrix-a" class="matrix-container"></div>
            <div class="matrix-label">A</div>
          </div>
          <div class="matrix-op">×</div>
          <div class="matrix-panel">
            <div id="sub-matrix-b" class="matrix-container"></div>
            <div class="matrix-label">B</div>
          </div>
          <div class="matrix-op">=</div>
          <div class="matrix-panel">
            <div id="sub-matrix-res" class="matrix-container"></div>
            <div class="matrix-label">Result</div>
          </div>
        </div>

        <!-- Add a dedicated computation area for the sub-demo -->
        <div id="sub-computation-area"></div>
        
        <div id="sub-comment" class="comment">Computing ${description}...</div>
      </div>
    `;
  }

  static initializeRecursiveSubDemo(overlay, A4x4, B4x4, onComplete, parentOverlay) {
    // Create a mini demo manager for the sub-demo
    const subContainers = {
      matA: overlay.querySelector('#sub-matrix-a'),
      matB: overlay.querySelector('#sub-matrix-b'),
      matR: overlay.querySelector('#sub-matrix-res'),
      commentBox: overlay.querySelector('#sub-comment'),
      workArea: overlay.querySelector('#sub-computation-area') // <-- FIXED property name
    };
    const subButtons = {
      prev: overlay.querySelector('#sub-prev-btn'),
      next: overlay.querySelector('#sub-next-btn'),
      generate: null
    };
    const subDemo = new DemoManager(subContainers, subButtons, subContainers.commentBox);
    // No need to set computationArea property anymore

    subDemo.A = A4x4;
    subDemo.B = B4x4;
    subDemo.events = EventBuilder.buildEvents(A4x4, B4x4);
    subDemo.ptr = 0;
    subDemo.showSubDemo = (termData, parentQuadrant, termLabel, subOnComplete) => {
      // Do NOT hide this overlay, just stack the new one on top
      SubDemoManager.showSubDemo(termData, parentQuadrant, termLabel, () => {
        // No need to restore overlay, just call subOnComplete
        if (typeof subOnComplete === 'function') subOnComplete();
      });
    };

    // Override the done handler to call onComplete
    const originalDoneHandler = subDemo.eventHandlers['done'];
    subDemo.eventHandlers['done'] = {
      handle: (event, currentResult) => {
        originalDoneHandler.handle.call(originalDoneHandler, event, currentResult);
        subButtons.next.textContent = 'Finish';
        subButtons.next.onclick = onComplete;
      }
    };

    subDemo.rebuild();
  }

  // Utility to get next overlay z-index
  static getNextOverlayZIndex() {
    // Find all overlays and set new one above the highest
    const overlays = Array.from(document.querySelectorAll('.demo-overlay'));
    let maxZ = 1000;
    overlays.forEach(o => {
      const z = parseInt(o.style.zIndex || 1000, 10);
      if (z > maxZ) maxZ = z;
    });
    return maxZ + 1;
  }
}