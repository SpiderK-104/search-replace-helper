import { StateEffect } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { MarkdownView, Notice, type Editor, Platform } from 'obsidian';
import type { DocRange } from '../types';
import type SearchReplaceHelperPlugin from '../main';
import { getCmView, getSelectionBoundingRange } from '../utils/editor';
import {
	clearSearchEffect,
	hasSearchField,
	makeReplacementText,
	readSearchValue,
	resolveMatches,
	searchExtension,
	searchReplacedEffect,
	setSearchConfigEffect,
	setSearchIndexEffect,
	setSearchScopeEffect,
	type SearchConfig,
	type SearchFieldValue,
} from './engine';
import {
	DEFAULT_POPUP_HINT,
	SearchReplacePopup,
	type PopupPoint,
	type PopupHandlers,
} from './popup';
import { SearchHistoryModal, type HistoryMode } from './history-modal';
import {
	recordSearchCombo,
	setSearchComboFavorite,
	type SearchCombo,
	type SearchHistoryEntry,
} from './history';
import { matchesHotkey, parseHotkey } from './hotkey';

const SELECTION_HIGHLIGHT_COLOR_VARIABLE = '--sr-helper-selection-color';
const REGEX_LIKE_PATTERN = /[\\^$.|?*+()[\]{}]/;

function ensureExtension(view: EditorView): void {
	// Obsidian reconfigures the CM view on its own (Live Preview block mode
	// switches, reading/source toggles, leaf remounts). A reconfigure rebuilds
	// the state from a configuration that no longer contains `searchExtension`,
	// so the field disappears from a view we already "installed" into. Probe the
	// live state instead of caching the view identity.
	if (hasSearchField(view)) {
		return;
	}
	view.dispatch({ effects: StateEffect.appendConfig.of(searchExtension) });
}

export class SearchReplaceController {
	private readonly plugin: SearchReplaceHelperPlugin;
	private popup: SearchReplacePopup | null = null;
	private historyModal: SearchHistoryModal | null = null;
	private boundView: EditorView | null = null;
	private boundEditor: Editor | null = null;
	private lastSynced: string | null = null;
	private lastPosition: PopupPoint | null = null;
	private historySavePending = false;

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

	isOpen(): boolean {
		return this.popup !== null;
	}

	updateAppearance(): void {
		this.boundView?.dom.style.setProperty(
			SELECTION_HIGHLIGHT_COLOR_VARIABLE,
			this.plugin.settings.selectionHighlightColor,
		);
		this.popup?.setOpacity(this.plugin.settings.popupOpacity);
		this.popup?.setFontSize(this.plugin.settings.popupFontSize);
		this.popup?.setHistoryEnabled(this.historyAvailable());
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
		this.updateAppearance();

		const scope = getSelectionBoundingRange(view);
		const config: SearchConfig = {
			term: '',
			regex: this.plugin.settings.defaultRegex,
			caseSensitive: this.plugin.settings.defaultCaseSensitive,
		};

		view.dispatch({
			effects: [setSearchScopeEffect.of(scope), setSearchConfigEffect.of(config)],
		});

		this.lastSynced = null;
		this.popup = new SearchReplacePopup(this.makeHandlers());
		this.popup.setTerm('');
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
		this.recordCurrentCombo();
		const editor = this.boundEditor;
		this.destroySession();
		editor?.focus();
	}

	destroy(): void {
		this.historyModal?.close();
		this.historyModal = null;
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
			onOpenHistory: () => this.openHistory('prefill'),
			onReplaceCurrent: () => this.replaceCurrent(),
			onReplaceAll: () => this.replaceAll(),
			onNavigate: (direction) => this.navigate(direction),
			onClose: () => this.close(),
			getOpacity: () => this.plugin.settings.popupOpacity,
			getFontSize: () => this.plugin.settings.popupFontSize,
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

	private historyAvailable(): boolean {
		return (
			this.plugin.settings.enableSearchHistory &&
			this.plugin.settings.searchHistory.length > 0
		);
	}

	private currentCombo(): SearchCombo | null {
		const view = this.boundView;
		const popup = this.popup;
		if (!view || !popup) {
			return null;
		}
		const config = readSearchValue(view).config;
		if (config.term.length === 0) {
			return null;
		}
		return {
			find: config.term,
			replace: popup.getReplacement(),
			regex: config.regex,
			caseSensitive: config.caseSensitive,
		};
	}

	private recordCurrentCombo(): void {
		if (!this.plugin.settings.enableSearchHistory || this.historySavePending) {
			return;
		}
		const combo = this.currentCombo();
		if (!combo) {
			return;
		}
		const settings = this.plugin.settings;
		const next = recordSearchCombo(
			settings.searchHistory,
			combo,
			settings.searchHistoryLimit,
		);
		if (next === settings.searchHistory) {
			return;
		}
		settings.searchHistory = next;
		this.historySavePending = true;
		void this.plugin.saveSettings().finally(() => {
			this.historySavePending = false;
		});
		this.popup?.setHistoryEnabled(this.historyAvailable());
	}

	/** The view the panel is bound to, or the active note when it is closed. */
	private resolveTarget(): {
		view: EditorView;
		scope: DocRange | null;
	} | null {
		if (this.boundView) {
			return {
				view: this.boundView,
				scope: readSearchValue(this.boundView).scope,
			};
		}
		const active = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
		if (!active?.editor) {
			return null;
		}
		try {
			const view = getCmView(active.editor);
			return { view, scope: getSelectionBoundingRange(view) };
		} catch (error) {
			console.error(
				'[search-replace-helper] Could not read the active editor.',
				error,
			);
			return null;
		}
	}

	private historyCountLabel(entry: SearchHistoryEntry): string {
		const target = this.resolveTarget();
		if (!target) {
			return '—';
		}
		const resolved = resolveMatches(
			target.view.state.doc,
			{
				term: entry.find,
				regex: entry.regex,
				caseSensitive: entry.caseSensitive,
			},
			target.scope,
		);
		if (resolved.invalidRegex) {
			return 'invalid';
		}
		if (resolved.matches.length === 0) {
			return '0';
		}
		return resolved.truncated ? `${resolved.matches.length}+` : String(resolved.matches.length);
	}

	hasSelectionScope(): boolean {
		const target = this.resolveTarget();
		return target?.scope !== null && target?.scope !== undefined;
	}

	openHistory(mode: HistoryMode): void {
		if (!this.plugin.settings.enableSearchHistory) {
			return;
		}
		if (this.historyModal) {
			return;
		}
		const modal = new SearchHistoryModal(this.plugin.app, mode, {
			getEntries: () => this.plugin.settings.searchHistory,
			getCountLabel: (entry) => this.historyCountLabel(entry),
			onApply: (entry) => {
				if (mode === 'apply') {
					this.applyHistoryToSelection(entry);
				} else {
					this.prefillHistoryEntry(entry);
				}
			},
			onToggleFavorite: (entry) => this.toggleHistoryFavorite(entry),
		});
		this.historyModal = modal;
		modal.onClose = () => {
			this.historyModal = null;
		};
		modal.open();
	}

	/** Runs a saved combo across the whole selection in one undo step. */
	private applyHistoryToSelection(entry: SearchHistoryEntry): void {
		const target = this.resolveTarget();
		if (!target) {
			new Notice('Open a Markdown note before using find and replace history.');
			return;
		}
		if (!target.scope) {
			new Notice('Select some text first, then pick a history entry.');
			return;
		}
		const config: SearchConfig = {
			term: entry.find,
			regex: entry.regex,
			caseSensitive: entry.caseSensitive,
		};
		const view = target.view;
		ensureExtension(view);
		const resolved = resolveMatches(view.state.doc, config, target.scope);
		if (resolved.invalidRegex) {
			new Notice(`Invalid pattern: ${entry.find}`);
			return;
		}
		if (resolved.matches.length === 0) {
			new Notice('No matches in the selection.');
			return;
		}
		const count = resolved.matches.length;
		const changes = resolved.matches.map((match) => ({
			from: match.from,
			to: match.to,
			insert: makeReplacementText(config, match, entry.replace),
		}));
		view.dispatch({
			changes,
			effects: [
				setSearchScopeEffect.of(target.scope),
				setSearchConfigEffect.of(config),
				searchReplacedEffect.of({ after: Number.POSITIVE_INFINITY }),
			],
		});
		this.popup?.setTerm(entry.find);
		this.popup?.setReplacement(entry.replace);
		this.popup?.setOptions(entry.regex, entry.caseSensitive);
		this.touchHistoryEntry(entry);
		this.lastSynced = null;
		this.refreshPopup();
		this.syncCurrent();
		new Notice(
			resolved.truncated
				? `Replaced ${count}+ matches in the selection.`
				: `Replaced ${count} ${
						count === 1 ? 'match' : 'matches'
				  } in the selection.`,
		);
	}

	private prefillHistoryEntry(entry: SearchHistoryEntry): void {
		const popup = this.popup;
		if (!popup) {
			return;
		}
		popup.setTerm(entry.find);
		popup.setReplacement(entry.replace);
		popup.setOptions(entry.regex, entry.caseSensitive);
		this.updateConfig((config) => ({
			...config,
			term: entry.find,
			regex: entry.regex,
			caseSensitive: entry.caseSensitive,
		}));
		popup.focusSearch();
	}

	/** Bump recency without losing the favorite flag. */
	private touchHistoryEntry(entry: SearchHistoryEntry): void {
		const settings = this.plugin.settings;
		settings.searchHistory = recordSearchCombo(
			settings.searchHistory,
			{
				find: entry.find,
				replace: entry.replace,
				regex: entry.regex,
				caseSensitive: entry.caseSensitive,
			},
			settings.searchHistoryLimit,
		);
		void this.plugin.saveSettings();
	}

	private toggleHistoryFavorite(entry: SearchHistoryEntry): void {
		const settings = this.plugin.settings;
		settings.searchHistory = setSearchComboFavorite(
			settings.searchHistory,
			entry,
			!entry.favorite,
		);
		void this.plugin.saveSettings();
	}

	async clearHistory(): Promise<void> {
		this.plugin.settings.searchHistory = [];
		await this.plugin.saveSettings();
		this.popup?.setHistoryEnabled(this.historyAvailable());
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
		this.recordCurrentCombo();
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
		this.recordCurrentCombo();
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
		popup.setScope(value.scope !== null);
		if (!value.active || value.config.term.length === 0) {
			popup.setCount('0');
			popup.setHint(DEFAULT_POPUP_HINT);
			return;
		}
		if (value.invalidRegex) {
			popup.setCount('Invalid pattern');
			popup.setHint(
				'Fix the regular expression, or turn .* off to search literally',
			);
			return;
		}
		if (value.matches.length === 0) {
			popup.setCount(
				value.scope ? 'No results in selection' : 'No results in note',
			);
			popup.setHint(this.noResultsHint(value));
			return;
		}
		const total = value.truncated
			? `${value.matches.length}+`
			: String(value.matches.length);
		popup.setCount(`${value.currentIndex + 1}/${total}`);
		popup.setHint(DEFAULT_POPUP_HINT);
	}

	private noResultsHint(value: SearchFieldValue): string {
		const term = value.config.term;
		if (/^\s|\s$/.test(term)) {
			return 'No match — check leading or trailing spaces in the pattern';
		}
		if (!value.config.regex && REGEX_LIKE_PATTERN.test(term)) {
			return 'Looks like a regex — press .* to turn regular expressions on';
		}
		if (value.config.regex && /^[\^$]/.test(term) && value.scope) {
			return 'No match — ^ and $ are relative to the selection';
		}
		return DEFAULT_POPUP_HINT;
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
		if (this.handleHistoryShortcut(event)) {
			return;
		}
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

	private handleHistoryShortcut(event: KeyboardEvent): boolean {
		if (!this.plugin.settings.enableSearchHistory) {
			return false;
		}
		if (event.isComposing || event.repeat) {
			return false;
		}
		if (this.historyModal) {
			return false;
		}
		// Never steal the shortcut while the user is typing in another modal.
		if (document.body.querySelector('.modal-container, .modal-bg')) {
			return false;
		}
		const chord = parseHotkey(this.plugin.settings.searchHistoryShortcut);
		if (!chord || !matchesHotkey(event, chord, Platform.isMacOS)) {
			return false;
		}
		event.preventDefault();
		event.stopPropagation();
		// The shortcut is the "small batch" path: it always needs a scope, and
		// it never falls back to the whole note.
		const target = this.resolveTarget();
		if (!target) {
			new Notice('Open a Markdown note before using find and replace history.');
			return true;
		}
		if (!target.scope) {
			new Notice('Select some text first, then press the history shortcut.');
			return true;
		}
		if (target.scope.from === target.scope.to) {
			return true;
		}
		this.openHistory('apply');
		return true;
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
		this.boundView?.dom.style.removeProperty(
			SELECTION_HIGHLIGHT_COLOR_VARIABLE,
		);
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