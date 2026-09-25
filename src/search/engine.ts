import {
	RangeSetBuilder,
	StateEffect,
	StateField,
	type Extension,
	type Text,
	type Transaction,
} from '@codemirror/state';
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view';
import { RegExpCursor, SearchQuery } from '@codemirror/search';
import type { DocRange } from '../types';
import { MAX_MATCHES } from '../constants';

export interface SearchConfig {
	term: string;
	regex: boolean;
	caseSensitive: boolean;
}

export interface SearchMatch extends DocRange {
	match?: RegExpExecArray;
}

export interface SearchFieldValue {
	active: boolean;
	config: SearchConfig;
	scope: DocRange | null;
	matches: SearchMatch[];
	currentIndex: number;
	truncated: boolean;
	invalidRegex: boolean;
}

export const setSearchConfigEffect = StateEffect.define<SearchConfig>();
export const setSearchScopeEffect = StateEffect.define<DocRange | null>();
export const setSearchIndexEffect = StateEffect.define<number>();
export const searchReplacedEffect = StateEffect.define<{ after: number }>();
export const clearSearchEffect = StateEffect.define<null>();

const selectionDecoration = Decoration.mark({ class: 'sr-helper-selection' });
const matchDecoration = Decoration.mark({ class: 'sr-helper-match' });
const currentDecoration = Decoration.mark({ class: 'sr-helper-match-current' });

export function emptySearchValue(): SearchFieldValue {
	return {
		active: false,
		config: { term: '', regex: false, caseSensitive: false },
		scope: null,
		matches: [],
		currentIndex: -1,
		truncated: false,
		invalidRegex: false,
	};
}

interface MatchCollection {
	matches: SearchMatch[];
	truncated: boolean;
	invalidRegex: boolean;
}

interface MatchStep {
	from: number;
	to: number;
	match?: RegExpExecArray;
}

function collectMatches(
	doc: Text,
	config: SearchConfig,
	scope: DocRange | null,
): MatchCollection {
	if (config.term.length === 0) {
		return { matches: [], truncated: false, invalidRegex: false };
	}

	const from = scope?.from ?? 0;
	const to = scope?.to ?? doc.length;

	let cursor: Iterator<MatchStep>;
	if (config.regex) {
		const query = new SearchQuery({
			search: config.term,
			regexp: true,
			caseSensitive: config.caseSensitive,
		});
		if (!query.valid) {
			return { matches: [], truncated: false, invalidRegex: true };
		}
		cursor = new RegExpCursor(
			doc,
			config.term,
			{ ignoreCase: !config.caseSensitive },
			from,
			to,
		);
	} else {
		cursor = new SearchQuery({
			search: config.term,
			caseSensitive: config.caseSensitive,
		}).getCursor(doc, from, to);
	}

	const matches: SearchMatch[] = [];
	let truncated = false;
	for (;;) {
		const step = cursor.next();
		if (step.done) {
			break;
		}
		if (step.value.from >= step.value.to) {
			continue;
		}
		if (matches.length >= MAX_MATCHES) {
			truncated = true;
			break;
		}
		matches.push({
			from: step.value.from,
			to: step.value.to,
			match: step.value.match,
		});
	}
	return { matches, truncated, invalidRegex: false };
}

function currentIndexFor(matches: SearchMatch[], ref: number): number {
	if (matches.length === 0) {
		return -1;
	}
	let index = 0;
	while (index < matches.length && matches[index]!.from < ref) {
		index++;
	}
	return index >= matches.length ? matches.length - 1 : index;
}

function updateField(
	value: SearchFieldValue,
	tr: Transaction,
): SearchFieldValue {
	let active = value.active;
	let config = value.config;
	let scope = value.scope;
	let explicitIndex: number | null = null;
	let replacedAfter: number | null = null;
	let queryChanged = false;
	let scopeChanged = false;

	for (const effect of tr.effects) {
		if (effect.is(setSearchConfigEffect)) {
			active = true;
			config = effect.value;
			queryChanged = true;
		} else if (effect.is(setSearchScopeEffect)) {
			active = true;
			scope = effect.value;
			scopeChanged = true;
		} else if (effect.is(setSearchIndexEffect)) {
			explicitIndex = effect.value;
		} else if (effect.is(searchReplacedEffect)) {
			replacedAfter = effect.value.after;
		} else if (effect.is(clearSearchEffect)) {
			return emptySearchValue();
		}
	}

	if (!active) {
		return value;
	}

	if (tr.docChanged && scope) {
		const from = tr.changes.mapPos(scope.from, 1);
		let to = tr.changes.mapPos(scope.to, 1);
		if (to < from) {
			to = from;
		}
		scope = { from, to };
		scopeChanged = true;
	}

	if (
		explicitIndex !== null &&
		!tr.docChanged &&
		!queryChanged &&
		!scopeChanged &&
		replacedAfter === null
	) {
		const index =
			value.matches.length === 0
				? -1
				: Math.min(Math.max(explicitIndex, 0), value.matches.length - 1);
		return { ...value, currentIndex: index };
	}

	const recompute =
		tr.docChanged || queryChanged || scopeChanged || replacedAfter !== null;
	if (!recompute) {
		return value;
	}

	const collected = collectMatches(tr.state.doc, config, scope);

	let ref: number;
	if (replacedAfter !== null) {
		ref = replacedAfter;
	} else if (scopeChanged) {
		ref = scope ? scope.from : 0;
	} else if (queryChanged) {
		ref = tr.startState.selection.main.from;
	} else if (tr.docChanged) {
		const previous = value.matches[value.currentIndex];
		ref = previous
			? tr.changes.mapPos(previous.from, 1)
			: tr.changes.mapPos(tr.startState.selection.main.from, 1);
	} else {
		ref = tr.startState.selection.main.from;
	}

	return {
		active,
		config,
		scope,
		matches: collected.matches,
		currentIndex: currentIndexFor(collected.matches, ref),
		truncated: collected.truncated,
		invalidRegex: collected.invalidRegex,
	};
}

function buildDecorations(value: SearchFieldValue): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();
	if (
		value.active &&
		value.config.term.length === 0 &&
		value.scope &&
		value.scope.from < value.scope.to
	) {
		builder.add(
			value.scope.from,
			value.scope.to,
			selectionDecoration,
		);
	}
	for (let i = 0; i < value.matches.length; i++) {
		const { from, to } = value.matches[i]!;
		if (from < to) {
			builder.add(
				from,
				to,
				i === value.currentIndex ? currentDecoration : matchDecoration,
			);
		}
	}
	return builder.finish();
}

export const searchStateField = StateField.define<SearchFieldValue>({
	create: () => emptySearchValue(),
	update: updateField,
	provide: (field) =>
		EditorView.decorations.from(field, (value) => buildDecorations(value)),
});

export const searchExtension: Extension = searchStateField.extension;

function unquoteText(text: string): string {
	return text.replace(/\\([nrt\\])/g, (_substring, char: string) =>
		char === 'n' ? '\n' : char === 'r' ? '\r' : char === 't' ? '\t' : '\\',
	);
}

export function expandReplacement(
	match: RegExpExecArray,
	replacement: string,
): string {
	return replacement.replace(/\$([$&]|\d+)/g, (substring, token: string) => {
		if (token === '&') {
			return match[0];
		}
		if (token === '$') {
			return '$';
		}
		for (let length = token.length; length > 0; length--) {
			const index = Number(token.slice(0, length));
			if (index > 0 && index < match.length) {
				return (match[index] ?? '') + token.slice(length);
			}
		}
		return substring;
	});
}

export function makeReplacementText(
	config: SearchConfig,
	match: SearchMatch,
	replacement: string,
): string {
	const unquoted = unquoteText(replacement);
	if (config.regex && match.match) {
		return expandReplacement(match.match, unquoted);
	}
	return unquoted;
}

export function readSearchValue(view: EditorView): SearchFieldValue {
	return view.state.field(searchStateField);
}

export function currentNode(view: EditorView): SearchMatch | null {
	const value = readSearchValue(view);
	if (!value.active || value.currentIndex < 0) {
		return null;
	}
	return value.matches[value.currentIndex] ?? null;
}