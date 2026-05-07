const {
  STORAGE_KEY,
  BLOCKED_COUNT_KEY,
  CUSTOM_HOSTS_KEY,
  MESSAGE_GET_PAGE_STATS,
  getApi,
  getStorage,
  setStorage,
  normalizeHost
} = globalThis.AcklessShared;

const HIDDEN_ATTR = "data-ackless-hidden";
let pageBlockedCount = 0;
let totalCountWrite = Promise.resolve();

const ACKNOWLEDGEMENT_PATTERNS = [
  /\bwelcome\s+to\s+country\b/i,
  /\backnowledg(?:e|ement|ing)\s+of\s+country\b/i,
  /\backnowledg(?:e|ement|ing)\s+country\b/i,
  /\btraditional\s+owners?\b/i,
  /\btraditional\s+custodians?\b/i,
  /\bfirst\s+nations\s+peoples?\b/i,
  /\baboriginal\s+and\s+torres\s+strait\s+islander\s+peoples?\b/i,
  /\belders?\s+past(?:,|\s)+present(?:,|\s)+(?:and\s+)?emerging\b/i,
  /\bsovereignty\s+was\s+never\s+ceded\b/i
];

const PLACE_NAME_REPLACEMENTS = [
  ["Ulu\u1e5fu", "Ayers Rock"],
  ["K'gari", "Fraser Island"],
  ["Gariwerd", "Grampians"],
  ["Wadjemup", "Rottnest Island"],
  ["Meeanjin", "Brisbane"],
  ["Naarm", "Melbourne"],
  ["Warrane", "Sydney Cove"],
  ["Tarndanya", "Adelaide"],
  ["nipaluna", "Hobart"],
  ["Gulumoerrgin", "Darwin"],
  ["Boorloo", "Perth"],
  ["Ngunnawal", "Canberra"]
];

const PLACE_NAME_RULES = PLACE_NAME_REPLACEMENTS.map(([from, to]) => ({
  pattern: new RegExp(`\\b${escapeRegExp(from)}\\b`, "giu"),
  replacement: to
}));

const DIALOG_SELECTOR = "dialog, [role='dialog'], [aria-modal='true']";

const BLOCK_SELECTOR = [
  DIALOG_SELECTOR,
  "[role='banner']",
  "aside",
  "section",
  "article",
  "header",
  "footer",
  "main > div",
  "body > div",
  "body > section",
  "body > aside",
  "p",
  "small"
].join(",");

const CANDIDATE_SELECTOR = [
  DIALOG_SELECTOR,
  "[role='banner']",
  "[class*='acknowledg' i]",
  "[id*='acknowledg' i]",
  "[class*='welcome' i]",
  "[id*='welcome' i]",
  "[class*='country' i]",
  "[id*='country' i]",
  "aside",
  "header",
  "footer",
  "section",
  "p",
  "small"
].join(",");

/** Controls we may call .click() on (no links or submit — navigation / form abuse). */
const PROGRAMMATIC_CLOSE_CONTROL_SELECTOR = [
  "button:not([disabled])",
  "[role='button']:not([aria-disabled='true'])",
  "input[type='button']:not([disabled])"
].join(",");

const CLOSE_CONTROL_PATTERNS = [
  /\bclose\b/i,
  /\bdismiss\b/i,
  /\bcontinue\b/i,
  /\bproceed\b/i,
  /\benter\b/i,
  /\bok(?:ay)?\b/i,
  /\baccept\b/i,
  /\bagree\b/i,
  /\bi\s+understand\b/i,
  /\bgot\s+it\b/i,
  /\bskip\b/i,
  /\b×\b/,
  /^\s*x\s*$/i
];

async function incrementBlockedCount(count) {
  if (count <= 0) return;

  pageBlockedCount += count;

  totalCountWrite = totalCountWrite.then(async () => {
    const result = await getStorage("local", { [BLOCKED_COUNT_KEY]: 0 });
    await setStorage("local", {
      [BLOCKED_COUNT_KEY]: result[BLOCKED_COUNT_KEY] + count
    });
  });

  await totalCountWrite;
}

async function isLikelyAustralianPage() {
  const host = normalizeHost(window.location.hostname);
  const lang = document.documentElement.lang.toLowerCase();

  const result = await getStorage("sync", { [CUSTOM_HOSTS_KEY]: [] });
  const customHosts = result[CUSTOM_HOSTS_KEY].map(normalizeHost);

  return (
    host.endsWith(".au") ||
    customHosts.some((customHost) => host === customHost || host.endsWith(`.${customHost}`)) ||
    lang === "en-au" ||
    lang.startsWith("en-au-")
  );
}

function textMatchesAcknowledgement(text) {
  if (!text || text.length > 2500) return false;
  return ACKNOWLEDGEMENT_PATTERNS.some((pattern) => pattern.test(text));
}

function hasInteractiveForm(element) {
  return Boolean(
    element.querySelector("input, textarea, select, form, video, audio, canvas")
  );
}

function chooseHideTarget(element) {
  const labelledBy = element.closest("[aria-labelledby]");
  if (labelledBy && textMatchesAcknowledgement(labelledBy.textContent)) {
    return labelledBy;
  }

  const dialog = element.closest(DIALOG_SELECTOR);
  if (dialog && textMatchesAcknowledgement(dialog.textContent)) {
    return dialog;
  }

  const block = element.closest(BLOCK_SELECTOR);
  if (block && !hasInteractiveForm(block) && textMatchesAcknowledgement(block.textContent)) {
    return block;
  }

  return element;
}

function hideElement(element) {
  if (!element || element.hasAttribute(HIDDEN_ATTR)) return false;

  const wasModal =
    element.matches(DIALOG_SELECTOR) ||
    Boolean(element.querySelector("[aria-modal='true']"));

  if (wasModal && closeAcknowledgementDialog(element)) {
    restorePageScrolling();

    if (!isElementVisible(element)) {
      element.setAttribute(HIDDEN_ATTR, "true");
      return true;
    }
  }

  element.setAttribute(HIDDEN_ATTR, "true");
  element.style.setProperty("display", "none", "important");
  element.style.setProperty("visibility", "hidden", "important");

  if (wasModal) {
    restorePageScrolling();
  }

  return true;
}

function isElementVisible(element) {
  return Boolean(element.isConnected && element.getClientRects().length > 0);
}

function isSafeToProgrammaticClick(control) {
  if (!(control instanceof HTMLElement)) return false;
  if (control.closest("a[href]")) return false;

  if (control instanceof HTMLButtonElement) {
    const rawType = control.getAttribute("type");
    if (rawType) {
      const t = rawType.toLowerCase();
      if (t === "submit" || t === "reset") return false;
    } else if (control.form) {
      return false;
    }
  }

  const rect = control.getBoundingClientRect();
  if (rect.width < 4 || rect.height < 4) return false;
  const style = window.getComputedStyle(control);
  if (style.visibility === "hidden" || style.display === "none") return false;
  if (Number.parseFloat(style.opacity) < 0.05) return false;
  return true;
}

function closeAcknowledgementDialog(element) {
  const nativeDialog = element.matches("dialog")
    ? element
    : element.querySelector("dialog");

  if (nativeDialog && typeof nativeDialog.close === "function" && nativeDialog.open) {
    nativeDialog.close();
    return true;
  }

  const controls = Array.from(element.querySelectorAll(PROGRAMMATIC_CLOSE_CONTROL_SELECTOR));
  const closeControl = controls.find((control) => {
    if (!isSafeToProgrammaticClick(control)) return false;

    const label = [
      control.getAttribute("aria-label"),
      control.getAttribute("title"),
      control.getAttribute("value"),
      control.textContent
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    return CLOSE_CONTROL_PATTERNS.some((pattern) => pattern.test(label));
  });

  if (!closeControl) return false;

  closeControl.click();
  return true;
}

function restorePageScrolling() {
  document.documentElement.style.removeProperty("overflow");
  document.documentElement.style.removeProperty("position");
  document.body.style.removeProperty("overflow");
  document.body.style.removeProperty("position");
  document.body.style.removeProperty("touch-action");

  document.body.classList.remove("modal-open", "no-scroll", "scroll-lock", "overflow-hidden");
}

function preserveCase(replacement, original) {
  if (original === original.toUpperCase()) {
    return replacement.toUpperCase();
  }

  const firstLetter = original.match(/[A-Za-z]/)?.[0];
  if (firstLetter && firstLetter === firstLetter.toLowerCase()) {
    return replacement.charAt(0).toLowerCase() + replacement.slice(1);
  }

  return replacement;
}

function replacePlaceNamesInText(text) {
  return PLACE_NAME_RULES.reduce((updatedText, { pattern, replacement }) => {
    return updatedText.replace(pattern, (match) => preserveCase(replacement, match));
  }, text);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function shouldSkipTextNode(node) {
  const parent = node.parentElement;
  if (!parent) return true;

  return Boolean(
    parent.closest(
      `[${HIDDEN_ATTR}='true'], script, style, noscript, textarea, input, select, option, code, pre, [contenteditable='true']`
    )
  );
}

function renamePlaceNames(root = document.body) {
  if (!root) return 0;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let renamedCount = 0;
  let node = walker.nextNode();

  while (node) {
    if (!shouldSkipTextNode(node)) {
      const originalText = node.nodeValue;
      const updatedText = replacePlaceNamesInText(originalText);

      if (updatedText !== originalText) {
        node.nodeValue = updatedText;
        renamedCount += 1;
      }
    }

    node = walker.nextNode();
  }

  return renamedCount;
}

function scanPage(root = document) {
  const candidates = getCandidates(root);

  let hiddenCount = 0;

  for (const candidate of candidates) {
    if (!(candidate instanceof HTMLElement)) continue;
    if (candidate.closest(`[${HIDDEN_ATTR}='true']`)) continue;

    const label = [
      candidate.getAttribute("aria-label"),
      candidate.getAttribute("title"),
      candidate.textContent
    ]
      .filter(Boolean)
      .join(" ");

    if (!textMatchesAcknowledgement(label)) continue;

    const target = chooseHideTarget(candidate);
    if (target instanceof HTMLElement && hideElement(target)) {
      hiddenCount += 1;
    }
  }

  return hiddenCount;
}

function getCandidates(root) {
  if (root instanceof HTMLElement && root.matches(CANDIDATE_SELECTOR)) {
    return [root, ...root.querySelectorAll(CANDIDATE_SELECTOR)];
  }

  return root.querySelectorAll(CANDIDATE_SELECTOR);
}

function watchPage() {
  let scanQueued = false;
  let pendingRoots = [];

  const queueScan = (mutations) => {
    pendingRoots.push(...getMutationRoots(mutations));

    if (scanQueued) return;
    scanQueued = true;

    window.setTimeout(() => {
      scanQueued = false;
      const roots = pendingRoots;
      pendingRoots = [];
      let hiddenCount = 0;

      for (const root of roots) {
        renamePlaceNames(root);
        hiddenCount += scanPage(root);
      }

      incrementBlockedCount(hiddenCount);
    }, 250);
  };

  const observer = new MutationObserver(queueScan);
  observer.observe(document.documentElement, {
    childList: true,
    characterData: true,
    subtree: true
  });
}

function getMutationRoots(mutations) {
  return mutations.flatMap((mutation) => {
    if (mutation.type === "characterData") {
      return mutation.target.parentElement ? [mutation.target.parentElement] : [];
    }

    return Array.from(mutation.addedNodes).filter((node) => node instanceof HTMLElement);
  });
}

async function isEnabled() {
  const result = await getStorage("sync", { [STORAGE_KEY]: true });
  return result[STORAGE_KEY] !== false;
}

function listenForPopupMessages() {
  const api = getApi();

  api.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== MESSAGE_GET_PAGE_STATS) return false;

    sendResponse({ pageBlockedCount });
    return false;
  });
}

async function start() {
  listenForPopupMessages();

  if (!(await isEnabled())) return;
  if (!(await isLikelyAustralianPage())) return;

  renamePlaceNames();
  incrementBlockedCount(scanPage());
  watchPage();
}

start();
