const DemoConfig = {
  MATRIX_CELL_SIZE: 30,
  SMALL_MATRIX_CELL_SIZE: 25,
  ANIMATION_DURATION: 600,
  QUADRANT_LABELS: ['11', '12', '21', '22'],
  
  QUADRANT_DEFINITIONS: [
    { name: 'C11', ar: 0, ac: 0, br: 0, bc: 0, rr: 0, rc: 0 },
    { name: 'C12', ar: 0, ac: 0, br: 0, bc: 'size', rr: 0, rc: 'size' },
    { name: 'C21', ar: 'size', ac: 0, br: 0, bc: 0, rr: 'size', rc: 0 },
    { name: 'C22', ar: 'size', ac: 0, br: 0, bc: 'size', rr: 'size', rc: 'size' }
  ],
  
  TERM_COLORS: {
    'C11': { term1: ['A11', 'B11'], term2: ['A12', 'B21'] },
    'C12': { term1: ['A11', 'B12'], term2: ['A12', 'B22'] },
    'C21': { term1: ['A21', 'B11'], term2: ['A22', 'B21'] },
    'C22': { term1: ['A21', 'B12'], term2: ['A22', 'B22'] }
  },

  getQuadrants(size) {
    return this.QUADRANT_DEFINITIONS.map(quad => ({
      ...quad,
      ar: quad.ar === 'size' ? size : quad.ar,
      ac: quad.ac === 'size' ? size : quad.ac,
      br: quad.br === 'size' ? size : quad.br,
      bc: quad.bc === 'size' ? size : quad.bc,
      rr: quad.rr === 'size' ? size : quad.rr,
      rc: quad.rc === 'size' ? size : quad.rc
    }));
  }
};