class TextFormatter {
  static formatComment(text, useLatex = true) {
    if (!useLatex || !window.MathJax) return text;
    
    return text.replace(/([ABCR])(11|12|21|22|1|2)/g, (match, letter, subscript) => {
      return `\\(${letter}_{${subscript}}\\)`;
    });
  }

  static formatEquation(quadrant, term1Desc, term2Desc) {
    const latexFormat = (text) => {
      return text.replace(/([ABCR])(11|12|21|22|1|2)/g, (match, letter, subscript) => {
        return `${letter}_{${subscript}}`;
      });
    };
    
    if (window.MathJax) {
      return `\\(${latexFormat(quadrant)} = ${latexFormat(term1Desc)} + ${latexFormat(term2Desc)}\\)`;
    } else {
      return `${quadrant} = ${term1Desc} + ${term2Desc}`;
    }
  }
}