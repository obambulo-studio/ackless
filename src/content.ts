import type { BlockRecord, RenameMatch } from "./activity-stats";
import { textMatchesAcknowledgement } from "./acknowledgement";
import {
  replacePlaceNamesInTextWithMatches,
  type PlaceNameMatch,
} from "./place-names";
import {
  STORAGE_KEY,
  CUSTOM_HOSTS_KEY,
  MESSAGE_RECORD_BLOCKS,
  MESSAGE_RECORD_RENAMES,
  getStorage,
  normalizeHost,
  getActivityHost,
  sendRuntimeMessage,
} from "./shared";

const HIDDEN_ATTR = "data-ackless-hidden";
const EXCERPT_MAX_LENGTH = 120;

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

function mergeRenameMatches(
  target: Map<string, RenameMatch>,
  matches: readonly PlaceNameMatch[]
): number {
  let added = 0;

  for (const match of matches) {
    if (match.count <= 0) {
      continue;
    }

    added += match.count;
    const key = `${match.from}\0${match.to}`;
    const existing = target.get(key);
    if (existing) {
      existing.count += match.count;
    } else {
      target.set(key, {
        from: match.from,
        to: match.to,
        count: match.count,
      });
    }
  }

  return added;
}

async function trackBlocks(blocks: readonly BlockRecord[]): Promise<void> {
  if (blocks.length === 0) {
    return;
  }

  await sendRuntimeMessage({
    type: MESSAGE_RECORD_BLOCKS,
    host: getActivityHost(),
    blocks,
  });
}

async function trackRenames(matches: readonly RenameMatch[]): Promise<void> {
  const total = matches.reduce((sum, match) => sum + match.count, 0);
  if (total <= 0) {
    return;
  }

  await sendRuntimeMessage({
    type: MESSAGE_RECORD_RENAMES,
    host: getActivityHost(),
    matches,
  });
}

function getAcknowledgementExcerpt(label: string): string {
  const normalized = label.replace(/\s+/g, " ").trim();
  if (normalized.length <= EXCERPT_MAX_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, EXCERPT_MAX_LENGTH - 1)}…`;
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

async function renamePlaceNames(root?: ParentNode): Promise<void> {
  const scope = root ?? document.body;
  if (!scope) {
    return;
  }

  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
  const aggregatedMatches = new Map<string, RenameMatch>();
  let textNode = walker.nextNode();

  while (textNode) {
    if (textNode instanceof Text && !shouldSkipTextNode(textNode)) {
      const originalText = textNode.nodeValue ?? "";
      const { text: updatedText, matches } =
        replacePlaceNamesInTextWithMatches(originalText);

      if (updatedText !== originalText) {
        textNode.nodeValue = updatedText;
        mergeRenameMatches(aggregatedMatches, matches);
      }
    }

    textNode = walker.nextNode();
  }

  if (aggregatedMatches.size > 0) {
    await trackRenames([...aggregatedMatches.values()]);
  }
}

function scanPage(root: ParentNode = document): BlockRecord[] {
  const candidates = getCandidates(root);
  const blocks: BlockRecord[] = [];

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
      blocks.push({ excerpt: getAcknowledgementExcerpt(label) });
    }
  }

  return blocks;
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
      const blocks: BlockRecord[] = [];

      void (async () => {
        for (const root of roots) {
          await renamePlaceNames(root);
          blocks.push(...scanPage(root));
        }

        await trackBlocks(blocks);
      })();
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

async function start(): Promise<void> {
  if (!(await isEnabled())) {
    return;
  }
  if (!(await isLikelyAustralianPage())) {
    return;
  }

  await renamePlaceNames();
  await trackBlocks(scanPage());
  watchPage();
}

void start();
