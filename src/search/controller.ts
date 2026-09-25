import { StateEffect } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { MarkdownView, type Editor } from 'obsidian';
import type SearchReplaceHelperPlugin from '../main';
import { MAX_PREFILL_LENGTH } from '../constants';
import { getCmView, getSelectionBoundingRange, prefillTerm } from '../utils/editor';
import {
	clearSearchEffect,
	makeReplacementText,
	readSearchValue,
	searchExtension,
	searchReplacedEffect,
	setSearchConfigEffect,
	setSearchIndexEffect,
	setSearchScopeEffect,
	type SearchConfig,
} from './engine';
import { SearchReplacePopup, type PopupPoint, type PopupHandlers } from './popup';

const installedViews = new WeakSet<EditorView>();

function ensureExtension(view: EditorView): void {
	if (installedViews.has(view)) {
		return;
	}
	view.dispatch({ effects: StateEffect.appendConfig.of(searchExtension) });
	installedViews.add(view);
}

export class SearchReplaceController {
	private readonly plugin: SearchReplaceHelperPlugin;
	private popup: SearchReplacePopup | null = null;
	private boundView: EditorView | null = null;
	private boundEditor: Editor | null = null;
	private lastSynced: string | null = null;
	private lastPosition: PopupPoint | null = null;

	constructor(plugin: SearchReplaceHelperPlugin) {
		this.plugin = plugin;
	}

	init(): void {
		this.plugin.registerEvent(
			this.plugin.app.workspace.on('active-leaf-change', () => {
				this.handleActiveLeafChange();
			}),
		);
		this.plugin.registerDomEvent(activeWindow, 'keydown', (event) => {
			this.handleGlobalKeydown(event);
		});
	}

	open(editor: Editor): void {
		const view = getCmView(editor);
		if (this.popup && this.boundView) {
			if (this.boundView === view) {
				this.popup.focusSearch();
				return;
			}
			this.destroySession();
		}

		this.boundView = view;
		this.boundEditor = editor;
		ensureExtension(view);

		const scope = getSelectionBoundingRange(editor);
		const term = this.plugin.settings.prefillSelection
			? prefillTerm(editor, MAX_PREFILL_LENGTH)
			: '';
		const config: SearchConfig = {
			term,
			regex: this.plugin.settings.defaultRegex,
			caseSensitive: this.plugin.settings.defaultCaseSensitive,
		};

		view.dispatch({
			effects: [setSearchScopeEffect.of(scope), setSearchConfigEffect.of(config)],
		});

		this.lastSynced = null;
		this.popup = new SearchReplacePopup(this.makeHandlers());
		this.popup.setTerm(term);
		this.popup.setOptions(config.regex, config.caseSensitive);
		this.popup.setReplacement('');
		this.popup.show(
			this.plugin.settings.rememberLastPosition
				? (this.lastPosition ?? undefined)
				: undefined,
		);
		this.refreshPopup();
		this.syncCurrent();
	}

	close(): void {
		const editor = this.boundEditor;
		this.destroySession();
		editor?.focus();
	}

	destroy(): void {
		this.destroySession();
	}

	private makeHandlers(): PopupHandlers {
		return {
			onQueryChange: (term) =>
				this.updateConfig((config) => ({ ...config, term })),
			onToggleRegex: (regex) =>
				this.updateConfig((config) => ({ ...config, regex })),
			onToggleCase: (caseSensitive) =>
				this.updateConfig((config) => ({ ...config, caseSensitive })),
			onReplaceCurrent: () => this.replaceCurrent(),
			onReplaceAll: () => this.replaceAll(),
			onNavigate: (direction) => this.navigate(direction),
			onClose: () => this.close(),
			getOpacity: () => this.plugin.settings.popupOpacity,
		};
	}

	private updateConfig(update: (config: SearchConfig) => SearchConfig): void {
		const view = this.boundView;
		if (!view) {
			return;
		}
		const config = update(readSearchValue(view).config);
		view.dispatch({ effects: setSearchConfigEffect.of(config) });
		this.lastSynced = null;
		this.refreshPopup();
		this.syncCurrent();
	}

	private replaceCurrent(): void {
		const view = this.boundView;
		const popup = this.popup;
		if (!view || !popup) {
			return;
		}
		const value = readSearchValue(view);
		if (!value.active || value.currentIndex < 0) {
			return;
		}
		const match = value.matches[value.currentIndex];
		if (!match) {
			return;
		}
		const insert = makeReplacementText(
			value.config,
			match,
			popup.getReplacement(),
		);
		view.dispatch({
			changes: { from: match.from, to: match.to, insert },
			effects: searchReplacedEffect.of({ after: match.from + insert.length }),
		});
		this.refreshPopup();
		this.syncCurrent();
	}

	private replaceAll(): void {
		const view = this.boundView;
		const popup = this.popup;
		if (!view || !popup) {
			return;
		}
		const value = readSearchValue(view);
		if (!value.active || value.matches.length === 0) {
			return;
		}
		const changes = value.matches.map((match) => ({
			from: match.from,
			to: match.to,
			insert: makeReplacementText(value.config, match, popup.getReplacement()),
		}));
		view.dispatch({
			changes,
			effects: searchReplacedEffect.of({ after: Number.POSITIVE_INFINITY }),
		});
		this.refreshPopup();
		this.syncCurrent();
	}

	private navigate(direction: 1 | -1): void {
		const view = this.boundView;
		if (!view) {
			return;
		}
		const value = readSearchValue(view);
		if (value.matches.length === 0) {
			return;
		}
		let index = value.currentIndex;
		if (index < 0) {
			index = direction === 1 ? 0 : value.matches.length - 1;
		} else {
			index += direction;
			if (index < 0) {
				index = value.matches.length - 1;
			} else if (index >= value.matches.length) {
				index = 0;
			}
		}
		view.dispatch({ effects: setSearchIndexEffect.of(index) });
		this.refreshPopup();
		this.syncCurrent();
	}

	private refreshPopup(): void {
		const view = this.boundView;
		const popup = this.popup;
		if (!view || !popup) {
			return;
		}
		const value = readSearchValue(view);
		if (!value.active) {
			popup.setCount('0');
			return;
		}
		if (value.config.term.length === 0) {
			popup.setCount('0');
			return;
		}
		if (value.invalidRegex) {
			popup.setCount('Invalid pattern');
			return;
		}
		if (value.matches.length === 0) {
			popup.setCount('No results');
			return;
		}
		const total = value.truncated
			? `${value.matches.length}+`
			: String(value.matches.length);
		popup.setCount(`${value.currentIndex + 1}/${total}`);
	}

	private syncCurrent(): void {
		const view = this.boundView;
		if (!view) {
			return;
		}
		const value = readSearchValue(view);
		if (!value.active || value.currentIndex < 0) {
			return;
		}
		const match = value.matches[value.currentIndex];
		if (!match) {
			return;
		}
		const key = `${match.from}:${match.to}`;
		if (this.lastSynced === key) {
			return;
		}
		this.lastSynced = key;
		const main = view.state.selection.main;
		if (main.from !== match.from || main.to !== match.to) {
			view.dispatch({
				selection: { anchor: match.from, head: match.to },
				effects: EditorView.scrollIntoView(match.from),
			});
		}
	}

	private handleGlobalKeydown(event: KeyboardEvent): void {
		if (!this.popup) {
			return;
		}
		if (event.key !== 'Escape') {
			return;
		}
		const modal = document.body.querySelector('.modal-container, .modal-bg');
		if (modal) {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
		this.close();
	}

	private handleActiveLeafChange(): void {
		if (!this.popup || !this.boundView) {
			return;
		}
		const active = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
		if (active && active.editor && getCmView(active.editor) === this.boundView) {
			return;
		}
		this.destroySession();
	}

	private destroySession(): void {
		if (this.boundView && this.popup) {
			this.boundView.dispatch({ effects: clearSearchEffect.of(null) });
		}
		if (this.popup) {
			this.lastPosition = this.popup.getPosition();
			this.popup.destroy();
			this.popup = null;
		}
		this.lastSynced = null;
		this.boundView = null;
		this.boundEditor = null;
	}
}