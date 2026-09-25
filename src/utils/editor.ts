import type { Editor, EditorPosition } from 'obsidian';
import type { EditorView } from '@codemirror/view';
import type { DocRange } from '../types';

export function getCmView(editor: Editor): EditorView {
	const editorInternals = editor as unknown as Record<string, unknown>;
	const view = (editorInternals.cm ?? editorInternals.cmEditor) as
		| EditorView
		| undefined;
	if (!view) {
		throw new Error(
			'No CodeMirror view is available on the current editor. The note may still be loading or may not be in source mode.',
		);
	}
	return view;
}

function offsetAt(editor: Editor, pos: EditorPosition): number {
	const withOffset = editor as unknown as {
		posToOffset?: (position: EditorPosition) => number;
	};
	if (typeof withOffset.posToOffset === 'function') {
		return withOffset.posToOffset(pos);
	}
	let offset = pos.ch;
	for (let line = 0; line < pos.line; line++) {
		offset += editor.getLine(line).length + 1;
	}
	return offset;
}

export function getSelectionBoundingRange(editor: Editor): DocRange | null {
	const selections = editor.listSelections();
	if (selections.length === 0) {
		return null;
	}
	let from = Number.POSITIVE_INFINITY;
	let to = Number.NEGATIVE_INFINITY;
	for (const selection of selections) {
		const offsetAnchor = offsetAt(editor, selection.anchor);
		const offsetHead = offsetAt(editor, selection.head);
		from = Math.min(from, offsetAnchor, offsetHead);
		to = Math.max(to, offsetAnchor, offsetHead);
	}
	if (!Number.isFinite(from) || from === to) {
		return null;
	}
	return { from, to };
}