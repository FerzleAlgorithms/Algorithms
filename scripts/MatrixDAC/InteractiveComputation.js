class InteractiveComputation {
  constructor(event, computationState, onStateChange, workArea) {
    this.event = event;
    this.computationState = computationState;
    this.onStateChange = onStateChange;
    this.stateKey = event.quadrant;
    this.workArea = workArea; // Store the correct work area
    
    this.initializeState();
  }

  initializeState() {
    if (!this.computationState[this.stateKey]) {
      this.computationState[this.stateKey] = {
        term1Computed: false,
        term2Computed: false,
        term1Result: null,
        term2Result: null
      };
    }
  }

  render() {
    const work = this.getOrCreateWorkArea(true);
    console.log('[InteractiveComputation] Rendering into work area:', work, 'ID:', work.id);
    const oldComp = work.querySelector('.computation-area');
    if (oldComp) {
      console.log('[InteractiveComputation] Removing old computation area');
      oldComp.remove();
    }

    const compArea = document.createElement('div');
    compArea.className = 'computation-area';

    const step = this.createComputationStep();
    const line = this.createInteractiveComputationLine();
    
    step.appendChild(line);
    compArea.appendChild(step);
    work.appendChild(compArea);

    if (window.MathJax) {
      MathJax.typesetPromise([compArea]).catch(err => console.log('MathJax error:', err));
    }
  }

  createComputationStep() {
    const step = document.createElement('div');
    step.className = 'computation-step interactive-computation';

    const title = document.createElement('div');
    title.className = 'step-title';
    title.innerHTML = TextFormatter.formatComment(`Computing ${this.event.quadrant}`);
    step.appendChild(title);

    const equation = document.createElement('div');
    equation.className = 'equation-line';
    const formattedEq = TextFormatter.formatEquation(
      this.event.quadrant, 
      this.event.term1.description, 
      this.event.term2.description
    );
    equation.innerHTML = formattedEq;
    step.appendChild(equation);

    return step;
  }

  createInteractiveComputationLine() {
    const line = document.createElement('div');
    line.className = 'matrix-computation interactive';

    this.addTerm1Elements(line);
    line.appendChild(MatrixRenderer.createOperator('+'));
    this.addTerm2Elements(line);
    line.appendChild(MatrixRenderer.createOperator('='));
    this.addResultContainers(line);

    return line;
  }

  addTerm1Elements(line) {
    const term1Desc = this.event.term1.description.split(' × ');
    line.appendChild(MatrixRenderer.wrapMatrixWithLabel(
      MatrixRenderer.renderSmallMatrix(this.event.term1.matrixA, this.event.term1.matrixA.length, 'term1'),
      term1Desc[0], 'term1'
    ));
    line.appendChild(MatrixRenderer.createOperator('×'));
    line.appendChild(MatrixRenderer.wrapMatrixWithLabel(
      MatrixRenderer.renderSmallMatrix(this.event.term1.matrixB, this.event.term1.matrixB.length, 'term1'),
      term1Desc[1], 'term1'
    ));
  }

  addTerm2Elements(line) {
    const term2Desc = this.event.term2.description.split(' × ');
    line.appendChild(MatrixRenderer.wrapMatrixWithLabel(
      MatrixRenderer.renderSmallMatrix(this.event.term2.matrixA, this.event.term2.matrixA.length, 'term2'),
      term2Desc[0], 'term2'
    ));
    line.appendChild(MatrixRenderer.createOperator('×'));
    line.appendChild(MatrixRenderer.wrapMatrixWithLabel(
      MatrixRenderer.renderSmallMatrix(this.event.term2.matrixB, this.event.term2.matrixB.length, 'term2'),
      term2Desc[1], 'term2'
    ));
  }

  addResultContainers(line) {
    const term1Container = this.createTermContainer('term1', 'R1');
    const term2Container = this.createTermContainer('term2', 'R2');
    
    line.appendChild(term1Container);
    line.appendChild(MatrixRenderer.createOperator('+'));
    line.appendChild(term2Container);
    
    this.addFinalResult(line);
  }

  createTermContainer(termKey, termLabel) {
    const container = document.createElement('div');
    container.className = 'term-container';
    
    const state = this.computationState[this.stateKey];
    const isComputed = state[`${termKey}Computed`];
    
    if (isComputed) {
      const termData = this.event[termKey];
      container.appendChild(MatrixRenderer.wrapMatrixWithLabel(
        MatrixRenderer.renderSmallMatrix(termData.result, termData.result.length, termKey),
        termLabel, termKey
      ));
    } else {
      container.appendChild(this.createTermButtons(termKey, termLabel));
    }
    
    return container;
  }

  createTermButtons(termKey, termLabel) {
    const placeholder = document.createElement('div');
    placeholder.className = 'result-placeholder';
    placeholder.textContent = termLabel;
    
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'term-buttons';
    
    const computeBtn = this.createComputeButton(termKey);
    const showBtn = this.createShowButton(termKey, termLabel);
    
    buttonContainer.appendChild(computeBtn);
    buttonContainer.appendChild(showBtn);
    placeholder.appendChild(buttonContainer);
    
    return placeholder;
  }

  createComputeButton(termKey) {
    const computeBtn = document.createElement('button');
    computeBtn.textContent = 'Compute';
    computeBtn.className = 'term-compute-btn';
    computeBtn.addEventListener('click', () => {
      this.computationState[this.stateKey][`${termKey}Computed`] = true;
      this.computationState[this.stateKey][`${termKey}Result`] = this.event[termKey].result;
      this.render();
      if (this.onStateChange) this.onStateChange(); // update buttons
    });
    return computeBtn;
  }

  createShowButton(termKey, termLabel) {
    const showBtn = document.createElement('button');
    showBtn.textContent = 'Show Computation';
    showBtn.className = 'term-show-btn';
    showBtn.addEventListener('click', () => {
      SubDemoManager.showSubDemo(this.event[termKey], this.event.quadrant, termLabel, () => {
        this.computationState[this.stateKey][`${termKey}Computed`] = true;
        this.computationState[this.stateKey][`${termKey}Result`] = this.event[termKey].result;
        this.render();
        if (this.onStateChange) this.onStateChange(); // update buttons
      });
    });
    return showBtn;
  }

  addFinalResult(line) {
    const state = this.computationState[this.stateKey];
    if (state.term1Computed && state.term2Computed) {
      line.appendChild(MatrixRenderer.createOperator('='));
      line.appendChild(MatrixRenderer.wrapMatrixWithLabel(
        MatrixRenderer.renderSmallMatrix(this.event.final, this.event.final.length, 'result'),
        this.event.quadrant, 'result'
      ));
      
      // Enable next button
      if (this.onStateChange) {
        setTimeout(() => this.onStateChange(), 0);
      }
    }
  }

  getOrCreateWorkArea(clearSummaries = false) {
    // Use the provided workArea if available
    let work = this.workArea;
    if (!work) {
      // fallback for main demo
      work = document.getElementById('work-area');
      if (!work) {
        work = document.createElement('div');
        work.id = 'work-area';
        const matrixRow = document.getElementById('matrix-row');
        matrixRow.parentNode.insertBefore(work, matrixRow.nextSibling);
      }
    }
    if (clearSummaries && work) {
      work.querySelectorAll('.result-summary').forEach(s => s.remove());
    }
    console.log('[InteractiveComputation] getOrCreateWorkArea returns:', work, 'ID:', work.id);
    return work;
  }
}