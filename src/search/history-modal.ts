import { App, FuzzySuggestModal, type FuzzyMatch } from 'obsidian';
import { CSS_PREFIX } from '../constants';
import type { SearchHistoryEntry } from './history';

/**
 * `apply`   – the caller has a selection and wants the combo run over it.
 * `prefill` – the caller only wants the combo loaded into the popup.
 */
export type HistoryMode = 'apply' | 'prefill';

export interface HistoryModalHandlers {
	getEntries(): SearchHistoryEntry[];
	getCountLabel(entry: SearchHistoryEntry): string;
	onApply(entry: SearchHistoryEntry): void;
	onToggleFavorite(entry: SearchHistoryEntry): void;
}

type HistoryGroup = 'favorite' | 'recent';

interface HistorySuggestion {
	entry: SearchHistoryEntry;
	group: HistoryGroup;
	firstOfGroup: boolean;
}

const GROUP_LABEL: Record<HistoryGroup, string> = {
	favorite: 'Favorites',
	recent: 'Recently used',
};

const PLACEHOLDER: Record<HistoryMode, string> = {
	apply: 'Filter saved find and replace combos…',
	prefill: 'Filter saved find and replace combos…',
};

export const FAVORITE_TOGGLE_HINT = 'Click the star, or press Mod+Shift+F';

export class SearchHistoryModal extends FuzzySuggestModal<HistorySuggestion> {
	private readonly handlers: HistoryModalHandlers;
	private readonly mode: HistoryMode;
	private readonly countCache = new Map<string, string>();
	private rendered: { suggestion: HistorySuggestion; el: HTMLElement }[] = [];

	constructor(app: App, mode: HistoryMode, handlers: HistoryModalHandlers) {
		super(app);
		this.mode = mode;
		this.handlers = handlers;
		this.setPlaceholder(PLACEHOLDER[mode]);
		this.modalEl.addClass(`${CSS_PREFIX}__history-modal`);
		this.modalEl.toggleClass(
			`${CSS_PREFIX}__history-modal-apply`,
			mode === 'apply',
		);
	}

	override getItems(): HistorySuggestion[] {
		const entries = this.handlers.getEntries();
		const favoriteCount = entries.filter((entry) => entry.favorite).length;
		return entries.map((entry, index) => ({
			entry,
			group: index < favoriteCount ? 'favorite' : 'recent',
			firstOfGroup: false,
		}));
	}

	override getItemText(item: HistorySuggestion): string {
		return item.entry.find;
	}

	override getSuggestions(query: string): FuzzyMatch<HistorySuggestion>[] {
		this.rendered = [];
		const matches = super.getSuggestions(query);
		let previous: HistoryGroup | null = null;
		return matches.map((match) => {
			const firstOfGroup = match.item.group !== previous;
			previous = match.item.group;
			return { ...match, item: { ...match.item, firstOfGroup } };
		});
	}

	override renderSuggestion(
		value: FuzzyMatch<HistorySuggestion>,
		el: HTMLElement,
	): void {
		const suggestion = value.item;
		const { entry, group, firstOfGroup } = suggestion;
		this.rendered.push({ suggestion, el });
		if (firstOfGroup) {
			el.createDiv({
				cls: `${CSS_PREFIX}__history-group`,
				text: GROUP_LABEL[group],
			});
		}
		const row = el.createDiv({ cls: `${CSS_PREFIX}__history-row` });
		row.createSpan({
			cls: `${CSS_PREFIX}__history-find`,
			text: entry.find,
		});
		row.createSpan({ cls: `${CSS_PREFIX}__history-arrow`, text: '→' });
		const empty = entry.replace.length === 0;
		row.createSpan({
			cls: empty
				? `${CSS_PREFIX}__history-replace ${CSS_PREFIX}__history-replace-empty`
				: `${CSS_PREFIX}__history-replace`,
			text: empty ? 'Delete' : entry.replace,
		});
		if (entry.regex) {
			row.createSpan({
				cls: `${CSS_PREFIX}__chip ${CSS_PREFIX}__chip-regex ${CSS_PREFIX}__chip-active`,
				text: '.*',
			});
		}
		if (entry.caseSensitive) {
			row.createSpan({
				cls: `${CSS_PREFIX}__chip ${CSS_PREFIX}__chip-active`,
				text: 'Aa',
			});
		}
		row.createSpan({
			cls: this.countClass(entry),
			text: this.countFor(entry),
		});
		const star = row.createSpan({
			cls: entry.favorite
				? `${CSS_PREFIX}__history-star ${CSS_PREFIX}__history-star-on`
				: `${CSS_PREFIX}__history-star`,
			text: entry.favorite ? '★' : '☆',
		});
		star.addEventListener('click', (event) => {
			event.preventDefault();
			event.stopPropagation();
			this.handlers.onToggleFavorite(entry);
			this.refresh();
		});
	}

	override async onOpen(): Promise<void> {
		await super.onOpen();
		this.scope.register(['Mod', 'Shift'], 'F', (event) => {
			const active = this.activeSuggestion();
			if (!active) {
				return false;
			}
			event.preventDefault();
			this.handlers.onToggleFavorite(active.entry);
			this.refresh();
			return false;
		});
	}

	override onChooseItem(item: HistorySuggestion): void {
		this.handlers.onApply(item.entry);
	}

	private countFor(entry: SearchHistoryEntry): string {
		const key = JSON.stringify([
			entry.find,
			entry.replace,
			entry.regex,
			entry.caseSensitive,
		]);
		const cached = this.countCache.get(key);
		if (cached !== undefined) {
			return cached;
		}
		const label = this.handlers.getCountLabel(entry);
		this.countCache.set(key, label);
		return label;
	}

	private countClass(entry: SearchHistoryEntry): string {
		const base = `${CSS_PREFIX}__history-count`;
		const label = this.countFor(entry);
		if (label === 'invalid') {
			return `${base} ${base}-invalid`;
		}
		if (label === '0') {
			return `${base} ${base}-empty`;
		}
		return base;
	}

	private activeSuggestion(): HistorySuggestion | null {
		const selected = this.resultContainerEl.querySelector('.is-selected');
		if (!selected) {
			return null;
		}
		const found = this.rendered.find(
			({ el }) => el === selected || el.contains(selected),
		);
		return found?.suggestion ?? null;
	}

	// The modal only re-reads getItems() on input, so replay the current query.
	private refresh(): void {
		const query = this.inputEl.value;
		this.inputEl.value = '';
		this.inputEl.dispatchEvent(new Event('input'));
		this.inputEl.value = query;
		this.inputEl.dispatchEvent(new Event('input'));
	}
}
