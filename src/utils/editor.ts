import type { Editor, EditorPosition } from 'obsidian';
import type { EditorView } from '@codemirror/view';
import type { DocRange } from '../types';

const CM_PROPERTY = 'cm' as const;

export function getCmView(editor: Editor): EditorView {
	const view = (editor as unknown as Record<string, unknown>)[CM_PROPERTY] as
		| EditorView
		| undefined;
	if (!view) {
		throw new Error('No CodeMirror view available for this editor.');
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

export function prefillTerm(editor: Editor, maxLength: number): string {
	const text = editor.getSelection();
	if (!text) {
		return '';
	}
	return text.replace(/\r?\n/g, ' ').trim().slice(0, maxLength);
}