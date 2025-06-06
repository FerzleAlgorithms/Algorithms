// File: /Algorithms/scripts/glossary-tooltips.js

// ————————————————————————————————————————————————
// 1) Load glossary data from JSON
// ————————————————————————————————————————————————
let GLOSSARY = [];

function initGlossaryTooltips() {
  fetch("/Algorithms/scripts/glossary-data.json?cb=" + Date.now(), {
    cache: "no-store",
  })
    .then((res) => {
      if (!res.ok) throw new Error("Failed to load glossary-data.json");
      return res.json();
    })
    .then((data) => {
      GLOSSARY = data;
      scheduleBuildAndWrap();
    })
    .catch((err) => console.error("Error loading glossary data:", err));
}

function scheduleBuildAndWrap() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(buildAndWrap, 0));
  } else {
    // DOM is already parsed
    setTimeout(buildAndWrap, 0);
  }
}

// ————————————————————————————————————————————————
// 2) Tooltip positioning (unchanged)
// ————————————————————————————————————————————————
let currentWrapper = null;
let currentTip     = null;

function positionTooltip(wrapper, tip) {
  const rect = wrapper.getBoundingClientRect();

  tip.style.visibility = "hidden";
  tip.style.display    = "block";
  tip.style.position   = "absolute";
  tip.style.left       = "0";
  tip.style.top        = "0";

  tip.style.display    = "";
  tip.style.visibility = "";
  tip.style.left       = "";
  tip.style.top        = "";
  tip.style.position   = "";

  const viewportWidth = document.documentElement.clientWidth;
  const termCenterX   = rect.left + rect.width / 2;

  tip.classList.remove("to-right", "to-left", "to-center");

  if (termCenterX < viewportWidth / 3) {
    tip.classList.add("to-right");
  } else if (termCenterX > (2 * viewportWidth) / 3) {
    tip.classList.add("to-left");
  } else {
    tip.classList.add("to-center");
  }
}

// ————————————————————————————————————————————————
// 3) buildAndWrap + walkTree (unchanged, except use fetched GLOSSARY)
// ————————————————————————————————————————————————
function buildAndWrap() {
  if (document.body.classList.contains("no-tooltips")) return;

  // 1) Sort longest?short
  const terms = GLOSSARY.map((i) => i.term).sort((a, b) => b.length - a.length);

  // 2) Build lookup
  const defLookup = {};
  GLOSSARY.forEach(({ term, definition }) => {
    defLookup[term] = definition;
  });

  // 3) Tags to skip
  const SKIP_TAGS = new Set([
    "STYLE","SCRIPT","A","H1","H2","H3","CODE","PRE","B","STRONG"
  ]);

  // 4) Wrap matches in text nodes
  function wrapTermsInNode(textNode) {
    if (textNode.nodeType !== Node.TEXT_NODE) return;
    const original = textNode.textContent;
    if (!original.trim()) return;

    let text = original;
    terms.forEach((term) => {
      //const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      //const regex   = new RegExp(`\\b${escaped}\\b`, "gi");
      
      // helper to escape any regex meta-chars in a piece of the term
      const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // split on non-word chars (so hyphens/spaces/underscores) and escape each
      const wordsplit = term.split(/\W+/).map(escapeRegex);
      // allow spaces or hyphens between words
      const corePattern = wordsplit.join("[\\s-]+");
      // allow an optional “s” or “es” on the end (skip if term already ends in s)
      const pluralSuffix =
        term.toLowerCase().endsWith("s") ? "" : "(?:es|s)?";
      // use lookarounds rather than \b so we don’t get stuck on hyphens
      const regex = new RegExp(
        `(?<!\\w)${corePattern}${pluralSuffix}(?!\\w)`,
        "gi"
      );
  
      if (!regex.test(text)) return;

      const parts   = text.split(regex);
      const matches = text.match(regex);
      const frag    = document.createDocumentFragment();

      parts.forEach((plain, i) => {
        if (plain) frag.appendChild(document.createTextNode(plain));
        if (matches && matches[i]) {
          const exact = matches[i];
          const wrap  = document.createElement("span");
          wrap.classList.add("glossary-term");
          wrap.setAttribute("data-term", term);
          wrap.textContent = exact;

          const tip = document.createElement("span");
          tip.classList.add("tooltip-content");
          tip.textContent = defLookup[term] || "";
          wrap.appendChild(tip);

          wrap.addEventListener("mouseenter", () => {
            currentWrapper = wrap;
            currentTip     = tip;
            positionTooltip(wrap, tip);
          });
          wrap.addEventListener("mouseleave", () => {
            tip.classList.remove("to-right","to-left","to-center");
            currentWrapper = currentTip = null;
          });

          frag.appendChild(wrap);
        }
      });

      textNode.replaceWith(frag);
      text = frag.textContent;
    });
  }

  // 5) Walk the DOM
  function walkTree(root) {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          let el = node.parentElement;
          while (el) {
            if (SKIP_TAGS.has(el.tagName)) return NodeFilter.FILTER_REJECT;
            el = el.parentElement;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      },
      false
    );

    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(wrapTermsInNode);
  }

  const rootEl = document.querySelector("#content") ||
                 document.querySelector("main")    ||
                 document.body;
  walkTree(rootEl);
}

// ————————————————————————————————————————————————
// 4) Kick everything off
// ————————————————————————————————————————————————
initGlossaryTooltips();
