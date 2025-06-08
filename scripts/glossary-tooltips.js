// File: /Algorithms/scripts/glossary-tooltips.js

// ————————————————————————————————————————————————
// 1) Load glossary data from JSON
// ————————————————————————————————————————————————
let GLOSSARY = [];

function initGlossaryTooltips() {
  fetch("/Algorithms/scripts/glossary-data.json?cb=" + Date.now(), { cache: "no-store" })
    .then(res => {
      if (!res.ok) throw new Error("Failed to load glossary-data.json");
      return res.json();
    })
    .then(data => {
      GLOSSARY = data;
      scheduleBuildAndWrap();
    })
    .catch(err => console.error("Error loading glossary data:", err));
}

// Kick off after DOM is ready
function scheduleBuildAndWrap() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => buildAndWrap());
  } else {
    buildAndWrap();
  }
}

// ————————————————————————————————————————————————
// 2) Tooltip positioning by mouse, classified by wrapper center
// ————————————————————————————————————————————————
function positionTooltipAt(x, y, tip, wrapper) {
  // 1) Make it a fixed tooltip
  tip.style.position = "fixed";
  tip.style.display  = "block";

  // 2) Measure wrapper and viewport
  const wrapRect = wrapper.getBoundingClientRect();
  const vw       = window.innerWidth;

  // 3) Measure natural tooltip width
  tip.style.left = "0px";
  const tipWidth = tip.getBoundingClientRect().width;

  // 4) Clear old classes
  tip.classList.remove("to-right", "to-left", "to-center");

  if (x <= vw / 3) {
    // LEFT THIRD → pop immediately to the right of the pointer
    tip.classList.add("to-right");
    tip.style.left = `${x + 8}px`;
    tip.style.top  = `${y}px`;
  }
  else if (x >= (2 * vw) / 3) {
    // RIGHT THIRD → pop immediately to the left of the pointer
    tip.classList.add("to-left");
    tip.style.left = `${x - tipWidth - 8}px`;
    tip.style.top  = `${y}px`;
  }
  else {
    // MIDDLE THIRD → center on the mouse
    tip.classList.add("to-center");
    tip.style.position = "fixed";
    tip.style.left = `${x}px`;
    tip.style.top  = `${y + 8}px`;
  }

}


/*
function positionTooltipAt(x, y, tip, wrapper) {
  // Show tooltip as fixed element
  tip.style.position = "fixed";
  tip.style.display  = "block";

  // Measure wrapper and tooltip
  const wrapRect = wrapper.getBoundingClientRect();
  const vw       = window.innerWidth;

  // Determine tooltip width (reset left for accurate measure)
  tip.style.left = "0px";
  const tipWidth = tip.getBoundingClientRect().width;

  // Clear previous direction classes
  tip.classList.remove("to-right", "to-left", "to-center");

  // Classify by wrapper center
  const wrapCenterX = wrapRect.left + wrapRect.width / 2;
  if (wrapCenterX <= vw / 3) {
    // left third → tooltip to right
    tip.classList.add("to-right");
    tip.style.left = `${wrapRect.right + 8}px`;
    tip.style.top  = `${wrapRect.top}px`;
  } else if (wrapCenterX >= (2 * vw) / 3) {
    // right third → tooltip to left
    tip.classList.add("to-left");
    tip.style.left = `${wrapRect.left - tipWidth - 8}px`;
    tip.style.top  = `${wrapRect.top}px`;
  } else {
    // middle third → tooltip centered above or below
    tip.classList.add("to-center");
    tip.style.left = `${wrapCenterX - tipWidth / 2}px`;
    tip.style.top  = `${wrapRect.bottom + 8}px`;
  }
}
*/
// ————————————————————————————————————————————————
// 3) Build & wrap glossary terms in text nodes
// ————————————————————————————————————————————————
function buildAndWrap() {
  if (document.body.classList.contains("no-tooltips")) return;

  const rootEl = document.querySelector("#content") || document.querySelector("main") || document.body;

  // Prepare regex patterns (longest first)
  const patterns = GLOSSARY.map(({ term, definition }) => {
    const escaped = term.split(/\W+/)
      .map(s => s.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&"))
      .join("[\\s-]+");
    const tail = term.toLowerCase().endsWith("s") ? "" : "(?:es|s)?";
    return { term, definition, regex: new RegExp(`(?<!\\w)${escaped}${tail}(?!\\w)`, "gi") };
  }).sort((a,b) => b.term.length - a.term.length);

  const SKIP = new Set(["STYLE","SCRIPT","A","H1","H2","H3","CODE","PRE","B","STRONG"]);
  function acceptNode(node) {
    let el = node.parentElement;
    while (el) {
      if (SKIP.has(el.tagName) || el.classList.contains("tooltip-content")) return NodeFilter.FILTER_REJECT;
      el = el.parentElement;
    }
    return NodeFilter.FILTER_ACCEPT;
  }

  // Collect text nodes
  const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, { acceptNode }, false);
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) textNodes.push(node);

  // Wrap matches in each text node
  textNodes.forEach(textNode => {
    const text = textNode.textContent;
    let matches = [];

    patterns.forEach(({ term, definition, regex }) => {
      regex.lastIndex = 0;
      let m;
      while ((m = regex.exec(text))) {
        matches.push({ start: m.index, end: regex.lastIndex, term, definition, matchText: m[0] });
      }
    });
    if (!matches.length) return;

    // Filter overlapping matches
    matches.sort((a,b) => a.start - b.start || b.end - a.end);
    const keep = [];
    let lastEnd = 0;
    matches.forEach(m => {
      if (m.start >= lastEnd) { keep.push(m); lastEnd = m.end; }
    });

    // Rebuild node content
    const frag = document.createDocumentFragment();
    let idx = 0;
    keep.forEach(({ start, end, term, definition, matchText }) => {
      if (idx < start) frag.appendChild(document.createTextNode(text.slice(idx, start)));
      const span = document.createElement("span");
      span.className = "glossary-term";
      span.style.whiteSpace = "nowrap";
      span.setAttribute("data-term", term);
      span.textContent = matchText;

      const tip = document.createElement("span");
      tip.className = "tooltip-content";
      tip.textContent = definition;
      tip.style.display = "none";
      tip.style.fontStyle = "normal";
      span.appendChild(tip);

      let hoverTimeout;
      span.addEventListener("mouseenter", evt => {
        hoverTimeout = setTimeout(() => {
          positionTooltipAt(evt.clientX, evt.clientY, tip, span);
        }, 1000);
      });
      span.addEventListener("mouseleave", () => {
        clearTimeout(hoverTimeout);
        tip.style.display = "none";
        tip.classList.remove("to-right","to-left","to-center");
      });

      frag.appendChild(span);
      idx = end;
    });
    if (idx < text.length) frag.appendChild(document.createTextNode(text.slice(idx)));

    textNode.replaceWith(frag);
  });
}

// Initialize tooltips
initGlossaryTooltips();
