class DemoManager {
  constructor(containers, buttons, commentBox) {
    this.containers = containers;
    this.buttons = buttons;
    this.A = [];
    this.B = [];
    this.events = [];
    this.ptr = -1;
    this.computationState = {};
    this.timer = null;

    // Use computationArea if provided, else fallback to global #work-area
    this.workArea = containers.workArea || document.getElementById('work-area');

    this.initializeEventHandlers();
    this.setupEventListeners();
  }

  initializeEventHandlers() {
    this.eventHandlers = {
      'init': new InitHandler(this),
      'show_partition': new PartitionHandler(this),
      'start_quadrant': new QuadrantStartHandler(this),
      'show_interactive_computation': new InteractiveComputationHandler(this),
      'copy_result': new CopyResultHandler(this),
      'done': new DoneHandler(this)
    };
  }
  setupEventListeners() {
    if (this.buttons.generate) {
      this.buttons.generate.addEventListener('click', () => this.generateNewDemo());
    }
    if (this.buttons.next) {
      this.buttons.next.addEventListener('click', () => this.nextStep());
    }
    if (this.buttons.prev) {
      this.buttons.prev.addEventListener('click', () => this.prevStep());
    }
  }


  generateNewDemo() {
    this.clearWorkArea();
    this.computationState = {};
    
    const n = parseInt(document.getElementById('dim-input').value, 10);
    this.A = MatrixUtils.genRandomMatrix(n);
    this.B = MatrixUtils.genRandomMatrix(n);
    this.events = EventBuilder.buildEvents(this.A, this.B);
    this.ptr = 0;
    this.rebuild();
    this.clearTimer();
  }

  nextStep() {
    if (this.ptr < this.events.length - 1) {
      this.ptr++;
      this.rebuild();
    }
  }

  prevStep() {
    if (this.ptr > 0) {
      this.ptr--;
      this.rebuild();
    }
  }

  rebuild() {
    const event = this.events[this.ptr];
    if (!event) return;

    const currentResult = this.getCurrentResult();
    const handler = this.getEventHandler(event.type);
    handler.handle(event, currentResult);

    this.updateComputationArea(event);

    this.updateButtons();
  }

  updateComputationArea(event) {
    //console.log('updateComputationArea event.type:', event.type);
    if (event.type === 'show_interactive_computation' || event.type === 'copy_result') {
      // Pass a callback to update buttons and comment after each computation step
      new InteractiveComputation(
        event,
        this.computationState,
        () => {
          this.updateButtons();
          // Also update the comment to reflect computation state
          if (event.type === 'show_interactive_computation') {
            const state = this.computationState[event.quadrant];
            if (state && state.term1Computed && state.term2Computed) {
              this.eventHandlers['show_interactive_computation'].updateComment(
                `Computation complete for ${event.quadrant}. You may proceed to the next step.`
              );
            }
          }
        },
        this.workArea
      ).render();
    } else {
       this.clearWorkArea(); // Always clear before handling new event
    }
    // For all other steps, clear the computation area (already done in rebuild)
  }

  getCurrentResult() {
    const currentResult = MatrixUtils.initZeroMatrix(this.A.length);
    for (let i = 1; i <= this.ptr; i++) {
      const ev = this.events[i];
      if (ev.type === 'copy_result') {
        this.copyResultToMatrix(ev, currentResult);
      }
    }
    return currentResult;
  }

  copyResultToMatrix(event, currentResult) {
    const size = this.A.length / 2;
    if (typeof event.final === 'number') {
      currentResult[event.targetR][event.targetC] = event.final;
    } else {
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          currentResult[event.targetR + r][event.targetC + c] = event.final[r][c];
        }
      }
    }
  }

  getEventHandler(type) {
    return this.eventHandlers[type] || this.eventHandlers['init'];
  }

  updateButtons() {
    const currentEvent = this.events[this.ptr];
    
    this.buttons.prev.disabled = (this.ptr <= 0);
    
    if (currentEvent && currentEvent.type === 'show_interactive_computation') {
      const state = this.computationState[currentEvent.quadrant];
      this.buttons.next.disabled = !(state && state.term1Computed && state.term2Computed);
    } else {
      this.buttons.next.disabled = (this.ptr >= this.events.length - 1);
    }
  }

  clearWorkArea() {
    // Only look up #work-area if this.workArea is not already set (main demo)
    if (!this.workArea) {
      this.workArea = document.getElementById('work-area');
    }
    if (this.workArea) {
      //console.log('[DemoManager] Clearing work area:', this.workArea, 'ID:', this.workArea.id);
      this.workArea.innerHTML = '';
    } else {
      //console.warn('[DemoManager] No work area found to clear!');
    }
  }

  clearTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}