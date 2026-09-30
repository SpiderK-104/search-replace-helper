export interface SearchHistoryEntry {
	find: string;
	replace: string;
	regex: boolean;
	caseSensitive: boolean;
	favorite: boolean;
}

export type SearchCombo = Omit<SearchHistoryEntry, 'favorite'>;

export const DEFAULT_HISTORY_LIMIT = 10;
export const MIN_HISTORY_LIMIT = 5;
export const MAX_HISTORY_LIMIT = 50;
export const DEFAULT_HISTORY_SHORTCUT = 'Alt+H';
export const HARD_HISTORY_CAP = 200;

export function searchComboKey(combo: SearchCombo): string {
	return JSON.stringify([combo.find, combo.replace, combo.regex, combo.caseSensitive]);
}

export function normalizeHistoryLimit(value: unknown): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return DEFAULT_HISTORY_LIMIT;
	}
	return Math.min(
		MAX_HISTORY_LIMIT,
		Math.max(MIN_HISTORY_LIMIT, Math.round(value)),
	);
}

export function normalizeHistoryShortcut(value: unknown): string {
	return typeof value === 'string' && value.trim().length > 0
		? value.trim()
		: DEFAULT_HISTORY_SHORTCUT;
}

function normalizeEntry(value: unknown): SearchHistoryEntry | null {
	if (typeof value !== 'object' || value === null) {
		return null;
	}
	const raw = value as Partial<Record<keyof SearchHistoryEntry, unknown>>;
	if (typeof raw.find !== 'string' || raw.find.length === 0) {
		return null;
	}
	return {
		find: raw.find,
		replace: typeof raw.replace === 'string' ? raw.replace : '',
		regex: raw.regex === true,
		caseSensitive: raw.caseSensitive === true,
		favorite: raw.favorite === true,
	};
}

export function withFavoritesFirst(
	entries: SearchHistoryEntry[],
): SearchHistoryEntry[] {
	return [
		...entries.filter((entry) => entry.favorite),
		...entries.filter((entry) => !entry.favorite),
	];
}

function trimRecents(
	entries: SearchHistoryEntry[],
	limit: number,
): SearchHistoryEntry[] {
	const favorites = entries.filter((entry) => entry.favorite);
	const recents = entries.filter((entry) => !entry.favorite);
	const effective = Math.min(
		Math.max(Math.round(limit), 0),
		MAX_HISTORY_LIMIT,
	);
	return [...favorites, ...recents.slice(0, effective)];
}

export function normalizeHistory(value: unknown): SearchHistoryEntry[] {
	if (!Array.isArray(value)) {
		return [];
	}
	const seen = new Set<string>();
	const entries: SearchHistoryEntry[] = [];
	for (const item of value) {
		const entry = normalizeEntry(item);
		if (!entry) {
			continue;
		}
		const key = searchComboKey(entry);
		if (seen.has(key)) {
			continue;
		}
		seen.add(key);
		entries.push(entry);
		if (entries.length >= HARD_HISTORY_CAP) {
			break;
		}
	}
	return withFavoritesFirst(entries);
}

export function recordSearchCombo(
	entries: SearchHistoryEntry[],
	combo: SearchCombo,
	limit: number,
): SearchHistoryEntry[] {
	if (combo.find.length === 0) {
		return entries;
	}
	const key = searchComboKey(combo);
	const existing = entries.find((entry) => searchComboKey(entry) === key);
	const next = entries.filter((entry) => searchComboKey(entry) !== key);
	next.unshift({ ...combo, favorite: existing?.favorite ?? false });
	return trimRecents(next, limit);
}

export function setSearchComboFavorite(
	entries: SearchHistoryEntry[],
	combo: SearchCombo,
	favorite: boolean,
): SearchHistoryEntry[] {
	const key = searchComboKey(combo);
	return withFavoritesFirst(
		entries.map((entry) =>
			searchComboKey(entry) === key ? { ...entry, favorite } : entry,
		),
	);
}

export function countFavorites(entries: SearchHistoryEntry[]): number {
	return entries.filter((entry) => entry.favorite).length;
}

export function trimSearchHistory(
	entries: SearchHistoryEntry[],
	limit: number,
): SearchHistoryEntry[] {
	return trimRecents(withFavoritesFirst(entries), limit);
}
