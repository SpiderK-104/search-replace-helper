import type { Editor } from 'obsidian';
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

export function getSelectionBoundingRange(view: EditorView): DocRange | null {
	let from = Number.POSITIVE_INFINITY;
	let to = Number.NEGATIVE_INFINITY;
	for (const range of view.state.selection.ranges) {
		if (range.from === range.to) {
			continue;
		}
		from = Math.min(from, range.from);
		to = Math.max(to, range.to);
	}
	if (!Number.isFinite(from) || from === to) {
		return null;
	}
	return { from, to };
}
