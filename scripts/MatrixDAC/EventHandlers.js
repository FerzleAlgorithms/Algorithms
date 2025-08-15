class EventHandler {
  constructor(demoManager) {
    this.demoManager = demoManager;
  }

  handle(event, currentResult) {
    throw new Error('Must implement handle method');
  }

  updateMatrices(A, B, result) {
    const { matA, matB, matR } = this.demoManager.containers;
    MatrixRenderer.renderMatrix(matA, A);
    MatrixRenderer.renderMatrix(matB, B);
    MatrixRenderer.renderMatrix(matR, result);
  }

  updateComment(text) {
    const { commentBox } = this.demoManager.containers;
    commentBox.innerHTML = TextFormatter.formatComment(text);
    if (window.MathJax&& window.MathJax.typesetPromise) {
      MathJax.typesetPromise([commentBox]).catch(err => console.log('MathJax error:', err));
    }
  }

  clearWorkArea() {
    // Use the instance's workArea, not the global one
    if (this.demoManager.workArea) {
      this.demoManager.workArea.innerHTML = '';
    }
  }
}

class InitHandler extends EventHandler {
  handle(event, currentResult) {
    this.clearWorkArea();
    this.updateMatrices(this.demoManager.A, this.demoManager.B, currentResult);
    this.updateComment('Starting divide-and-conquer matrix multiplication...');
  }
}

class PartitionHandler extends EventHandler {
  handle(event, currentResult) {
    this.clearWorkArea();
    this.updateMatrices(this.demoManager.A, this.demoManager.B, currentResult);
    
    const { matA, matB, matR } = this.demoManager.containers;
    OverlayManager.showOverlay(matA, event.size);
    OverlayManager.showOverlay(matB, event.size);
    OverlayManager.showOverlay(matR, event.size);
    
    this.updateComment(`Partitioning ${event.size}×${event.size} matrices into ${event.size/2}×${event.size/2} blocks`);
  }
}

class QuadrantStartHandler extends EventHandler {
  handle(event, currentResult) {
    this.clearWorkArea(); // <-- Add this line
    console.log('QuadrantStartHandler event:', event);
    const termColors = DemoConfig.TERM_COLORS[event.quadrant];
    const { matA, matB, matR } = this.demoManager.containers;

    this.updateMatrices(this.demoManager.A, this.demoManager.B, currentResult);

    OverlayManager.showOverlay(matA, this.demoManager.A.length, { termColors });
    OverlayManager.showOverlay(matB, this.demoManager.B.length, { termColors });
    OverlayManager.showOverlay(matR, this.demoManager.A.length, { activeQuadrant: event.quadrant });

    const formula = `${event.quadrant} = ${termColors.term1[0]}×${termColors.term1[1]} + ${termColors.term2[0]}×${termColors.term2[1]}`;
    this.updateComment(`Computing ${formula}`);
  }
}

class InteractiveComputationHandler extends EventHandler {
  handle(event, currentResult) {  
    const state = this.demoManager.computationState[event.quadrant];
    if (state && state.term1Computed && state.term2Computed) {
      return;
    }

    console.log('InteractiveComputationHandler event:', event);

    // Do NOT render or clear computation area here

    const { matR } = this.demoManager.containers;
    MatrixRenderer.renderMatrix(matR, currentResult);
    
    const termColors = DemoConfig.TERM_COLORS[event.quadrant];
    const { matA, matB } = this.demoManager.containers;
    
    OverlayManager.showOverlay(matA, this.demoManager.A.length, { termColors });
    OverlayManager.showOverlay(matB, this.demoManager.B.length, { termColors });
    OverlayManager.showOverlay(matR, this.demoManager.A.length, { activeQuadrant: event.quadrant });
    
    this.updateComment(`Interactive computation for ${event.quadrant}. Choose "Compute" for direct calculation or "Show Computation" for step-by-step demo.`);
  }
}

class CopyResultHandler extends EventHandler {
  handle(event, currentResult) {
    // Do NOT clearWorkArea here; let it persist for this step
    const highlightRegion = {
      r: event.targetR,
      c: event.targetC,
      size: this.demoManager.A.length / 2
    };
    const { matA, matB, matR } = this.demoManager.containers;
    MatrixRenderer.renderMatrix(matA, this.demoManager.A);
    MatrixRenderer.renderMatrix(matB, this.demoManager.B);
    MatrixRenderer.renderMatrix(matR, currentResult, { highlightRegion });
    OverlayManager.hideOverlay(matA);
    OverlayManager.hideOverlay(matB);
    OverlayManager.hideOverlay(matR);
    this.updateComment(`${event.quadrant} computation complete and copied to result matrix`);
  }
}

class DoneHandler extends EventHandler {
  handle(event, currentResult) {
    this.clearWorkArea();
    const { matA, matB, matR } = this.demoManager.containers;
    OverlayManager.hideOverlay(matA);
    OverlayManager.hideOverlay(matB);
    OverlayManager.hideOverlay(matR);

    // Remove computation area from the correct workArea
    if (this.demoManager.workArea) {
      const oldComp = this.demoManager.workArea.querySelector('.computation-area');
      if (oldComp) oldComp.remove();
    }

    this.updateMatrices(this.demoManager.A, this.demoManager.B, event.result);
    this.updateComment('Complete! Matrix multiplication finished.');
  }
}


