// File: /Algorithms/scripts/glossary-tooltips.js

import { GLOSSARY } from "/Algorithms/scripts/glossary-data.js";

// --- Track the currently hovered term & tooltip to reposition on resize ---------
let currentWrapper = null;
let currentTip     = null;

/**
 * positionTooltip(wrapper, tip)
 *
 * Measures available space to decide whether to place the tooltip to the
 * right or left of the wrapper element. Adds either “to-right” or “to-left”
 * class on the `tip` <span> accordingly.
 */
/**
 * positionTooltip(wrapper, tip)
 *
 * Instead of flipping left/right by remaining space,
 * we now look at the *horizontal center* of the term and divide
 * the viewport into three equal “zones”:
 *
 *   • left third  ? always show tooltip to the right  (.to-right)
 *   • mid third   ? center the tooltip horizontally (.to-center)
 *   • right third ? show tooltip to the left   (.to-left)
 */
function positionTooltip(wrapper, tip) {
  // 1) Measure the term’s bounding box:
  const rect = wrapper.getBoundingClientRect();

  // 2) Temporarily show the tooltip off-screen so we can measure it (if needed):
  tip.style.visibility = "hidden";
  tip.style.display    = "block";
  tip.style.position   = "absolute";
  tip.style.left       = "0px";
  tip.style.top        = "0px";
  // const tooltipWidth = tip.offsetWidth; // only if you actually need it

  // 3) Now clear all of those temporary inline styles:
  tip.style.display    = "";
  tip.style.visibility = "";
  tip.style.left       = "";
  tip.style.top        = "";
  tip.style.position   = "";
  // (If you ever set other inline properties here, clear them too.)

  // 4) Figure out where the term’s center lies (left/middle/right third of viewport):
  const viewportWidth = document.documentElement.clientWidth;
  const termCenterX   = rect.left + rect.width / 2;

  // 5) Remove any old directional class, then add one of to-right/to-center/to-left:
  tip.classList.remove("to-right", "to-left", "to-center");

  if (termCenterX < viewportWidth / 3) {
    tip.classList.add("to-right");
  } else if (termCenterX > (2 * viewportWidth) / 3) {
    tip.classList.add("to-left");
  } else {
    tip.classList.add("to-center");
  }
}



function buildAndWrap() {
  // --- EARLY EXIT on the glossary page ---------------------------------
  // If <body> has class="no-tooltips", do nothing.
  if (document.body.classList.contains("no-tooltips")) {
    return;
  }
  // 1) Sort glossary terms longest?short so multi-word phrases match first
  const terms = GLOSSARY
    .map((item) => item.term)
    .sort((a, b) => b.length - a.length);

  // 2) Build lookup: term ? definition
  const defLookup = {};
  GLOSSARY.forEach(({ term, definition }) => {
    defLookup[term] = definition;
  });

  // 3) SKIP_TAGS: exclude tags where we don’t want tooltips inserted
  const SKIP_TAGS = new Set([
    "STYLE",
    "SCRIPT",
    "A",
    "H1",
    "H2",
    "H3",
    "CODE",
    "PRE",
    "B",
    "STRONG"
  ]);

  // 4) For each TEXT_NODE, wrap all matches of each glossary term
  function wrapTermsInNode(textNode) {
    if (textNode.nodeType !== Node.TEXT_NODE) return;

    const originalText = textNode.textContent;
    if (!originalText.trim()) return;

    let text = originalText;

    terms.forEach((term) => {
      // Build a case-insensitive, word-boundary regex for “term”
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escaped}\\b`, "gi");

      if (!regex.test(text)) {
        return; // no match ? skip
      }

      // Split on each match (preserving original casing via matches[])
      const parts = text.split(regex);
      const matches = text.match(regex);

      const frag = document.createDocumentFragment();
      parts.forEach((plainPart, i) => {
        if (plainPart) {
          frag.appendChild(document.createTextNode(plainPart));
        }
        if (matches && matches[i]) {
          const exactMatch = matches[i];
          const wrapper = document.createElement("span");
          wrapper.classList.add("glossary-term");
          wrapper.setAttribute("data-term", term);
          wrapper.textContent = exactMatch;

          const tip = document.createElement("span");
          tip.classList.add("tooltip-content");
          tip.textContent = defLookup[term] || "";
          wrapper.appendChild(tip);

          // --- Add dynamic positioning listeners ---------------------------
          wrapper.addEventListener("mouseenter", () => {
            currentWrapper = wrapper;
            currentTip     = tip;
            positionTooltip(wrapper, tip);
          });
          wrapper.addEventListener("mouseleave", () => {
            tip.classList.remove("to-right", "to-left","to-center");
            currentWrapper = null;
            currentTip     = null;
          });

          frag.appendChild(wrapper);
        }
      });

      // Replace the original text node with our wrapped fragment
      textNode.replaceWith(frag);
      text = frag.textContent; // allow subsequent terms to match inside
    });
  }

  // 5) Walk the DOM under “root,” skipping any node with an ancestor in SKIP_TAGS
  function walkTree(root) {
    const textNodes = [];
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          let el = node.parentElement;
          while (el) {
            if (SKIP_TAGS.has(el.tagName)) {
              return NodeFilter.FILTER_REJECT;
            }
            el = el.parentElement;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      },
      false
    );

    let node;
    while ((node = walker.nextNode())) {
      textNodes.push(node);
    }

    textNodes.forEach((tn) => {
      wrapTermsInNode(tn);
    });
  }

  // 6) Choose which element to scan:
  //    • If you have <div id="content">, pick that
  //    • Otherwise <main>
  //    • Otherwise fall back to <body>
  const rootElement =
    document.querySelector("#content") ||
    document.querySelector("main") ||
    document.body;

  walkTree(rootElement);
}

// 7) Initialization: wait for at least DOMContentLoaded or window.load,
//    then run buildAndWrap on the next microtask:
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(buildAndWrap, 0);
  });
} else if (document.readyState === "interactive") {
  window.addEventListener("load", () => {
    setTimeout(buildAndWrap, 0);
  });
} else {
  // readyState === "complete"
  setTimeout(buildAndWrap, 0);
}

// 8) Reposition any open tooltip on window resize
//window.addEventListener("resize", () => {
//  if (currentWrapper && currentTip) {
//    positionTooltip(currentWrapper, currentTip);
//  }
//});
