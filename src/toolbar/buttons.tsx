import React from 'react';
import type { HTMLAttributes, PointerEvent, ReactNode } from 'react';
import { EditorState, useEditorState } from '../editor/EditorContext';
import OrderedListIcon from './icons/OrderedListIcon';
import UnorderedListIcon from './icons/UnorderedListIcon';
import { getActiveElement } from '../utils';

/** ---------- Root / selection helpers ---------- */

function getRoot(el?: HTMLElement): Document | ShadowRoot | null {
  return el ? (el.getRootNode() as Document | ShadowRoot) : null;
}

function getScopedSelection(el?: HTMLElement): Selection | null {
  const root = getRoot(el);
  // ShadowRoot has getSelection() in modern Chromium/Firefox; fall back to document/window.
  if (root && 'getSelection' in root && typeof (root as any).getSelection === 'function') {
    return (root as any).getSelection() as Selection | null;
  }
  const doc = el?.ownerDocument ?? document;
  return doc.getSelection();
}



/** Tag checks used when queryCommandState can’t see into Shadow DOM */
function closestTag(el: Node | null, tagNames: string[], stopAt?: HTMLElement): HTMLElement | null {
  let cur: Node | null = el;
  while (cur) {
    if (cur === stopAt) break;
    if (cur instanceof HTMLElement) {
      const t = cur.tagName;
      if (tagNames.includes(t)) return cur;
    }
    cur = (cur as HTMLElement)?.parentNode ?? null;
  }
  return null;
}

function isFormatActiveFallback(cmd: string, editorEl?: HTMLElement): boolean {
  const sel = getScopedSelection(editorEl);
  const focus = sel?.focusNode ?? null;
  if (!focus || !editorEl) return false;

  switch (cmd) {
    case 'bold':
      return !!closestTag(focus, ['B', 'STRONG'], editorEl);
    case 'italic':
      return !!closestTag(focus, ['I', 'EM'], editorEl);
    case 'underline':
      return !!closestTag(focus, ['U'], editorEl) ||
        !!closestTag(focus, ['SPAN'], editorEl)?.style?.textDecoration?.includes('underline');
    case 'strikeThrough':
      return !!closestTag(focus, ['S', 'STRIKE', 'DEL'], editorEl) ||
        !!closestTag(focus, ['SPAN'], editorEl)?.style?.textDecoration?.includes('line-through');
    case 'insertUnorderedList':
      return !!closestTag(focus, ['UL'], editorEl);
    case 'insertOrderedList':
      return !!closestTag(focus, ['OL'], editorEl);
    default:
      return false;
  }
}

/** Shadow-aware exec + state */
function execScoped(editorEl: HTMLElement | undefined, command: string, value?: string) {
  // Keep focus on the editor’s host so selection remains intact
  if (editorEl && getActiveElement(editorEl) !== editorEl) editorEl.focus();

  const doc = editorEl?.ownerDocument ?? document;
  // execCommand only exists on Document; it will operate on the focused editing host.
  // Even with shadow selection, Chromium applies it if the host is focused.
  doc.execCommand(command, false, value);
}

function queryStateScoped(editorEl: HTMLElement | undefined, command: string): boolean {
  const doc = editorEl?.ownerDocument ?? document;
  try {
    // If selection is bridged to document, this will be correct
    const v = doc.queryCommandState(command);
    // If browsers return false for shadow selections, fall back to manual checks:
    if (v === false) return isFormatActiveFallback(command, editorEl);
    return v;
  } catch {
    return isFormatActiveFallback(command, editorEl);
  }
}

/** ---------- Buttons ---------- */

export const BtnBold = createButton('Bold', '𝐁', 'bold');
export const BtnItalic = createButton('Italic', '𝑰', 'italic');
export const BtnUnderline = createButton('Underline', <span style={{ textDecoration: 'underline' }}>𝐔</span>, 'underline');
export const BtnStrikeThrough = createButton('Strike through', <s>ab</s>, 'strikeThrough');

export const BtnBulletList = createButton('Bullet list', <UnorderedListIcon />, 'insertUnorderedList');
export const BtnNumberedList = createButton('Numbered list', <OrderedListIcon />, 'insertOrderedList');

export const BtnUndo = createButton('Undo', '↶', 'undo');
export const BtnRedo = createButton('Redo', '↷', 'redo');

export const BtnClearFormatting = createButton('Clear formatting', 'T̲ₓ', 'removeFormat');

export const BtnLink = createButton('Link', '🔗', ({ $selection, $el }) => {
  const selNode = $selection as Node | null;
  const inAnchor = closestTag(selNode, ['A'], $el || undefined);
  const win = ($el?.ownerDocument?.defaultView ?? window);
  if (inAnchor) {
    execScoped($el!, 'unlink');
  } else {
    const url = win.prompt('URL', '') || undefined;
    if (url) execScoped($el!, 'createLink', url);
  }
});

export function createButton(
  title: string,
  content: ReactNode,
  command: ((state: EditorState) => void) | string,
) {
  ButtonFactory.displayName = title.replace(/\s/g, '');
  return ButtonFactory;

  function ButtonFactory(props: HTMLAttributes<HTMLButtonElement>) {
    const editorState = useEditorState();
    const { $el } = editorState;

    const isElFocused = () => Boolean($el?.contains(getActiveElement($el || undefined)));

    let active = false;
    if (typeof command === 'string') {
      // Shadow-aware state
      active = isElFocused() && queryStateScoped($el || undefined, command);
    }

    function onAction(e: PointerEvent<HTMLButtonElement>) {
      // Use pointerdown to avoid mouseup stealing focus/selection
      e.preventDefault();

      if (!isElFocused()) {
        $el?.focus();
      }

      if (typeof command === 'function') {
        command(editorState);
      } else {
        execScoped($el || undefined, command);
      }
    }

    if (editorState.htmlMode) return null;

    return (
      <button
        className="rsw-btn"
        data-active={active}
        onPointerDown={onAction}
        tabIndex={-1}
        title={title}
        type="button"
        {...props}
      >
        {content}
      </button>
    );
  }
}
