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

function positionTooltipAt(x, y, tip) {
  tip.style.position = "fixed";
  tip.style.display  = "block";

  // 1) Measure your content‐frame
  const frame = document.querySelector('#content')
               || document.querySelector('main')
               || document.body;
  const frameRect = frame.getBoundingClientRect();

  // 2) Measure the tooltip’s own width
  tip.style.left = "0px";
  const tipWidth = tip.getBoundingClientRect().width;

  // 3) Clear previous positioning classes
  tip.classList.remove("to-right", "to-left", "to-center");

  // 4) Compute mouse‐x relative to the frame’s left edge
  const relX = x - frameRect.left;
  const third = frameRect.width / 3;

  if (relX < third) {
    tip.classList.add("to-right");
    tip.style.left = `${x + 8}px`;
    tip.style.top  = `${y}px`;
  }
  else if (relX > 2 * third) {
    tip.classList.add("to-left");
    tip.style.left = `${x - tipWidth - 8}px`;
    tip.style.top  = `${y}px`;
  }
  else {
    tip.classList.add("to-center");
    
    // center tooltip on the mouse X
    let left = x - tipWidth / 2;
    
    // clamp so it never bleeds past the frame edges
    const minLeft = frameRect.left + 8;
    const maxLeft = frameRect.right - tipWidth - 8;
    left = Math.min(Math.max(left, minLeft), maxLeft);
    
    tip.style.left = `${left}px`;
    tip.style.top  = `${y + 8}px`;
  }
}

// ————————————————————————————————————————————————
// 3) Build & wrap glossary terms in text nodes
// ————————————————————————————————————————————————
function buildAndWrap() {
  if (document.body.classList.contains("no-tooltips")) return;

  const rootEl = document.querySelector("#content")
                || document.querySelector("main")
                || document.body;

  // Prepare regex patterns (longest first)
  const patterns = GLOSSARY.map(({ variants, definition }) => {
    const canonical = variants[0];

    // build a pattern for each variant, allowing spaces or hyphens between parts
    const altPatterns = variants.map(v => {
      const parts = v.split(/[\s-]+/);
      const escaped = parts
        .map(s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("[\\s-]+");
      return escaped;
    });
    const alts = altPatterns.join("|");

    // match full words, not embedded in letters, digits, underscores or extra hyphens
    const regex = new RegExp(`(?<![\\w-])(?:${alts})(?![\\w-])`, "gi");

    return { canonical, definition, regex };
  })
  .sort((a, b) => b.canonical.length - a.canonical.length);

  const SKIP = new Set(["STYLE","SCRIPT","A","H1","H2","H3","CODE","PRE","B","STRONG"]);
  function acceptNode(node) {
    let el = node.parentElement;
    while (el) {
      if (SKIP.has(el.tagName) || el.classList.contains("tooltip-content"))
        return NodeFilter.FILTER_REJECT;
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

    patterns.forEach(({ canonical, definition, regex }) => {
      regex.lastIndex = 0;
      let m;
      while ((m = regex.exec(text))) {
        matches.push({
          start: m.index,
          end: regex.lastIndex,
          canonical,
          definition,
          matchText: m[0]
        });
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
    keep.forEach(({ start, end, canonical, definition, matchText }) => {
      if (idx < start) frag.appendChild(document.createTextNode(text.slice(idx, start)));
      const span = document.createElement("span");
      span.className = "glossary-term";
      span.style.whiteSpace = "nowrap";
      span.setAttribute("data-term", canonical);
      span.textContent = matchText;

      const tip = document.createElement("span");
      tip.className = "tooltip-content";
      /*tip.textContent = definition;*/
      tip.innerHTML = definition;
      tip.style.display = "none";
      tip.style.fontStyle = "normal";
      span.appendChild(tip);

      let hoverTimeout;
      span.addEventListener("mouseenter", evt => {
        span.classList.add('highlighted');
        hoverTimeout = setTimeout(() => {
          positionTooltipAt(evt.clientX, evt.clientY, tip);
        }, 1000);
      });
      span.addEventListener("mouseleave", () => {
        span.classList.remove('highlighted');
        tip.style.display = 'none';
        clearTimeout(hoverTimeout);
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
