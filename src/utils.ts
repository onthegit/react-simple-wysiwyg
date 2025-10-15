import type { ForwardedRef } from 'react';

export function autoconfigureTextDirection(el: HTMLElement | undefined) {
  if (el) {
    const text = el.textContent;
    const rtlPattern = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;
    el.style.direction = text && rtlPattern.test(text[0]) ? 'rtl' : 'ltr';
  }
}

export function cls(...classNames: unknown[]): string {
  return classNames.filter(Boolean).join(' ');
}

export function getSelectedNode(): Node | undefined {
  if ((document as any).selection) {
    return (document as any).selection.createRange().parentElement();
  }

  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    return selection.getRangeAt(0).startContainer.parentNode || undefined;
  }

  return undefined;
}

export function getSelectedNode2(rootEl?: HTMLElement): Node | undefined {
  const root = rootEl?.getRootNode() as Document | ShadowRoot | undefined || window;
  const sel: Selection | null = root && typeof (root as any).getSelection === 'function'
    ? (root as any).getSelection()
    : (rootEl?.ownerDocument ?? document).getSelection();
  return sel?.focusNode ?? undefined;
}

export function normalizeHtml(str: unknown): string {
  return typeof str === 'string'
    ? str.replace(/&nbsp;|\u202F|\u00A0/g, ' ').replace(/<br \/>/g, '<br>')
    : String(str);
}

export const getActiveElement = (el?: HTMLElement) => {
  const root = el?.getRootNode();
  return root && root instanceof ShadowRoot
    ? root.activeElement
    : document.activeElement;
};

export function replaceCaret(el: HTMLElement) {
  // Place the caret at the end of the element
  const target = document.createTextNode('');
  el.appendChild(target);

  // do not move caret if element was not focused
  const isTargetFocused = getActiveElement() === el;
  if (target !== null && target.nodeValue !== null && isTargetFocused) {
    const sel = getScopedSelection(el);
    if (sel) {
      const range = document.createRange();
      range.setStart(target, target.nodeValue.length);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    if (el instanceof HTMLElement) el.focus();
  }
}

export function setForwardRef<T = HTMLDivElement>(
  el: T,
  ref?: ForwardedRef<T>,
) {
  if (typeof ref === 'function') {
    ref(el);
  } else if (typeof ref === 'object' && ref) {
    // eslint-disable-next-line no-param-reassign
    ref.current = el;
  }
}


export function getRoot(el?: HTMLElement): Document | ShadowRoot | null {
  return el ? (el.getRootNode() as Document | ShadowRoot) : null;
}

export function getScopedSelection(el?: HTMLElement): Selection | null {
  const root = getRoot(el);
  // ShadowRoot has getSelection() in modern Chromium/Firefox; fall back to document/window.
  if (root && 'getSelection' in root && typeof (root as any).getSelection === 'function') {
    return (root as any).getSelection() as Selection | null;
  }
  const doc = el?.ownerDocument ?? document;
  return doc.getSelection();
}