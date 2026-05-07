import { textMatchesAcknowledgement } from "./acknowledgement";
import { isPageStatsRequestMessage } from "./messages";
import { replacePlaceNamesInText } from "./place-names";
import {
  STORAGE_KEY,
  BLOCKED_COUNT_KEY,
  CUSTOM_HOSTS_KEY,
  getStorage,
  setStorage,
  normalizeHost,
  getApi,
} from "./shared";

const HIDDEN_ATTR = "data-ackless-hidden";
let pageBlockedCount = 0;
let totalCountWrite: Promise<void> = Promise.resolve();

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
  "small",
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
  "small",
].join(",");

/** Controls we may call .click() on (no links or submit — navigation / form abuse). */
const PROGRAMMATIC_CLOSE_CONTROL_SELECTOR = [
  "button:not([disabled])",
  "[role='button']:not([aria-disabled='true'])",
  "input[type='button']:not([disabled])",
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
  /^\s*x\s*$/i,
];

async function incrementBlockedCount(count: number): Promise<void> {
  if (count <= 0) {
    return;
  }

  pageBlockedCount += count;

  totalCountWrite = totalCountWrite.then(async () => {
    const result = await getStorage("local", { [BLOCKED_COUNT_KEY]: 0 });
    await setStorage("local", {
      [BLOCKED_COUNT_KEY]: result[BLOCKED_COUNT_KEY] + count,
    });
  });

  await totalCountWrite;
}

async function isLikelyAustralianPage(): Promise<boolean> {
  const host = normalizeHost(window.location.hostname);
  const lang = document.documentElement.lang.toLowerCase();

  const result = await getStorage("sync", {
    [CUSTOM_HOSTS_KEY]: [] as string[],
  });
  const customHosts = result[CUSTOM_HOSTS_KEY].map(normalizeHost);

  return (
    host.endsWith(".au") ||
    customHosts.some(
      (customHost: string) =>
        host === customHost || host.endsWith(`.${customHost}`)
    ) ||
    lang === "en-au" ||
    lang.startsWith("en-au-")
  );
}

function hasInteractiveForm(element: Element): boolean {
  return Boolean(
    element.querySelector("input, textarea, select, form, video, audio, canvas")
  );
}

function shouldSkipTextNode(node: Text): boolean {
  const parent = node.parentElement;
  if (!parent) {
    return true;
  }

  return Boolean(
    parent.closest(
      `[${HIDDEN_ATTR}='true'], script, style, noscript, textarea, input, select, option, code, pre, [contenteditable='true']`
    )
  );
}

function chooseHideTarget(element: HTMLElement): HTMLElement {
  const labelledBy = element.closest("[aria-labelledby]");
  if (labelledBy && textMatchesAcknowledgement(labelledBy.textContent ?? "")) {
    return labelledBy instanceof HTMLElement ? labelledBy : element;
  }

  const dialog = element.closest(DIALOG_SELECTOR);
  if (dialog && textMatchesAcknowledgement(dialog.textContent ?? "")) {
    return dialog instanceof HTMLElement ? dialog : element;
  }

  const block = element.closest(BLOCK_SELECTOR);
  if (
    block &&
    !hasInteractiveForm(block) &&
    textMatchesAcknowledgement(block.textContent ?? "")
  ) {
    return block instanceof HTMLElement ? block : element;
  }

  return element;
}

function hideElement(element: HTMLElement): boolean {
  if (!element || element.hasAttribute(HIDDEN_ATTR)) {
    return false;
  }

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

function isElementVisible(element: HTMLElement): boolean {
  return Boolean(element.isConnected && element.getClientRects().length > 0);
}

function isSafeToProgrammaticClick(control: Element): control is HTMLElement {
  if (!(control instanceof HTMLElement)) {
    return false;
  }
  if (control.closest("a[href]")) {
    return false;
  }

  if (control instanceof HTMLButtonElement) {
    const rawType = control.getAttribute("type");
    if (rawType) {
      const t = rawType.toLowerCase();
      if (t === "submit" || t === "reset") {
        return false;
      }
    } else if (control.form) {
      return false;
    }
  }

  const rect = control.getBoundingClientRect();
  if (rect.width < 4 || rect.height < 4) {
    return false;
  }
  const style = window.getComputedStyle(control);
  if (style.visibility === "hidden" || style.display === "none") {
    return false;
  }
  if (Number.parseFloat(style.opacity) < 0.05) {
    return false;
  }
  return true;
}

function closeAcknowledgementDialog(element: HTMLElement): boolean {
  const nativeDialog = element.matches("dialog")
    ? element
    : element.querySelector("dialog");

  if (
    nativeDialog instanceof HTMLDialogElement &&
    typeof nativeDialog.close === "function" &&
    nativeDialog.open
  ) {
    nativeDialog.close();
    return true;
  }

  const controls = [
    ...element.querySelectorAll(PROGRAMMATIC_CLOSE_CONTROL_SELECTOR),
  ];
  const closeControl = controls.find((control) => {
    if (!isSafeToProgrammaticClick(control)) {
      return false;
    }

    const label = [
      control.getAttribute("aria-label"),
      control.getAttribute("title"),
      control.getAttribute("value"),
      control.textContent,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    return CLOSE_CONTROL_PATTERNS.some((pattern) => pattern.test(label));
  });

  if (!closeControl || !(closeControl instanceof HTMLElement)) {
    return false;
  }

  closeControl.click();
  return true;
}

function restorePageScrolling(): void {
  document.documentElement.style.removeProperty("overflow");
  document.documentElement.style.removeProperty("position");
  document.body.style.removeProperty("overflow");
  document.body.style.removeProperty("position");
  document.body.style.removeProperty("touch-action");

  document.body.classList.remove(
    "modal-open",
    "no-scroll",
    "scroll-lock",
    "overflow-hidden"
  );
}

function renamePlaceNames(root?: ParentNode): number {
  const scope = root ?? document.body;
  if (!scope) {
    return 0;
  }

  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
  let renamedCount = 0;
  let textNode = walker.nextNode();

  while (textNode) {
    if (textNode instanceof Text && !shouldSkipTextNode(textNode)) {
      const originalText = textNode.nodeValue ?? "";
      const updatedText = replacePlaceNamesInText(originalText);

      if (updatedText !== originalText) {
        textNode.nodeValue = updatedText;
        renamedCount += 1;
      }
    }

    textNode = walker.nextNode();
  }

  return renamedCount;
}

function scanPage(root: ParentNode = document): number {
  const candidates = getCandidates(root);

  let hiddenCount = 0;

  for (const candidate of candidates) {
    if (!(candidate instanceof HTMLElement)) {
      continue;
    }
    if (candidate.closest(`[${HIDDEN_ATTR}='true']`)) {
      continue;
    }

    const label = [
      candidate.getAttribute("aria-label"),
      candidate.getAttribute("title"),
      candidate.textContent,
    ]
      .filter(Boolean)
      .join(" ");

    if (!textMatchesAcknowledgement(label)) {
      continue;
    }

    const target = chooseHideTarget(candidate);
    if (target instanceof HTMLElement && hideElement(target)) {
      hiddenCount += 1;
    }
  }

  return hiddenCount;
}

function getCandidates(root: ParentNode): Iterable<Element> {
  if (root instanceof HTMLElement && root.matches(CANDIDATE_SELECTOR)) {
    return [root, ...root.querySelectorAll(CANDIDATE_SELECTOR)];
  }

  return root.querySelectorAll(CANDIDATE_SELECTOR);
}

function watchPage(): void {
  let scanQueued = false;
  let pendingRoots: HTMLElement[] = [];

  const queueScan = (mutations: MutationRecord[]) => {
    pendingRoots.push(...getMutationRoots(mutations));

    if (scanQueued) {
      return;
    }
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

      void incrementBlockedCount(hiddenCount);
    }, 250);
  };

  const observer = new MutationObserver(queueScan);
  observer.observe(document.documentElement, {
    characterData: true,
    childList: true,
    subtree: true,
  });
}

function getMutationRoots(mutations: MutationRecord[]): HTMLElement[] {
  return mutations.flatMap((mutation) => {
    if (mutation.type === "characterData") {
      const parent = mutation.target.parentElement;
      return parent ? [parent] : [];
    }

    return [...mutation.addedNodes].filter(
      (node): node is HTMLElement => node instanceof HTMLElement
    );
  });
}

async function isEnabled(): Promise<boolean> {
  const result = await getStorage("sync", { [STORAGE_KEY]: true });
  return result[STORAGE_KEY] !== false;
}

function listenForPopupMessages(): void {
  const api = getApi();

  api.runtime.onMessage.addListener(
    (
      message: unknown,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response?: unknown) => void
    ) => {
      // Sync response only: `sendResponse` runs before the listener returns and we use `return false`
      // (not `true`). If this handler ever becomes async, switch to `return true` and Chrome's async
      // response contract.
      if (!isPageStatsRequestMessage(message)) {
        return false;
      }

      sendResponse({ pageBlockedCount });
      return false;
    }
  );
}

async function start(): Promise<void> {
  listenForPopupMessages();

  if (!(await isEnabled())) {
    return;
  }
  if (!(await isLikelyAustralianPage())) {
    return;
  }

  renamePlaceNames();
  await incrementBlockedCount(scanPage());
  watchPage();
}

void start();
