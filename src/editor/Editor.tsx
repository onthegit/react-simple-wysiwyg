// Editor.tsx
import { ComponentProps, ForwardedRef, SyntheticEvent } from 'react';
import React from 'react';
import { cls, getScopedSelection, getSelectedNode2, setForwardRef } from '../utils';
import { ContentEditable, ContentEditableProps } from './ContentEditable';
import { useEditorState } from './EditorContext';
import '../styles.css';


export const Editor = React.forwardRef(function Editor(
  { autoFocus, children, containerProps, onSelect, ...rest }: EditorProps,
  ref: ForwardedRef<HTMLDivElement>,
) {
  const editorState = useEditorState();

  React.useEffect(() => {
    const doc = editorState.$el?.ownerDocument ?? document;

    function onClickOutside(event: MouseEvent) {
      if (event.target === editorState.$el) return;
      if (editorState.$el?.contains(event.target as HTMLElement)) return;
      editorState.update({ $selection: undefined });
    }

    function onSelectionChange() {
      // fires for collapsed caret moves too
      const sel = getScopedSelection(editorState.$el || undefined);
      // keep storing a node (like before), but from the scoped selection
      editorState.update({ $selection: sel?.focusNode ?? undefined });
    }

    doc.addEventListener('click', onClickOutside);
    doc.addEventListener('selectionchange', onSelectionChange);
    return () => {
      doc.removeEventListener('click', onClickOutside);
      doc.removeEventListener('selectionchange', onSelectionChange);
    };
  }, [editorState.$el]); // rebind when host is known

  function onTextSelect(event: SyntheticEvent<HTMLDivElement>) {
    onSelect?.(event);
    // still useful when user drags to select
    editorState.update({ $selection: getSelectedNode2(editorState.$el) });
  }

  function setContentEditableRef($el: HTMLDivElement) {
    editorState.update({ $el });
    setForwardRef($el, ref);
    if (autoFocus && $el && editorState.$el === undefined) {
      $el.focus();
    }
  }

  const cssClass = cls('rsw-editor', containerProps?.className);

  if (editorState.htmlMode) {
    return (
      <div {...containerProps} className={cssClass}>
        {children}
        <textarea {...rest} className="rsw-ce rsw-html" />
      </div>
    );
  }

  return (
    <div {...containerProps} className={cssClass}>
      {children}
      <ContentEditable
        {...rest}
        ref={setContentEditableRef}
        onSelect={onTextSelect}
      />
    </div>
  );
});

export interface EditorProps extends ContentEditableProps {
  containerProps?: ComponentProps<'div'>;
}
