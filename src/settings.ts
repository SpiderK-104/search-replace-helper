import { App, PluginSettingTab, Setting } from 'obsidian';
import type { SettingDefinitionItem } from 'obsidian';
import type SearchReplaceHelperPlugin from './main';
import {
	DEFAULT_HISTORY_LIMIT,
	DEFAULT_HISTORY_SHORTCUT,
	MAX_HISTORY_LIMIT,
	MIN_HISTORY_LIMIT,
	normalizeHistoryLimit,
	normalizeHistoryShortcut,
	type SearchHistoryEntry,
} from './search/history';

export interface SearchReplaceSettings {
	defaultRegex: boolean;
	defaultCaseSensitive: boolean;
	selectionHighlightColor: string;
	popupOpacity: number;
	popupFontSize: number;
	rememberLastPosition: boolean;
	enableSearchHistory: boolean;
	searchHistoryLimit: number;
	searchHistoryShortcut: string;
	searchHistory: SearchHistoryEntry[];
}

export const DEFAULT_SETTINGS: SearchReplaceSettings = {
	defaultRegex: false,
	defaultCaseSensitive: false,
	selectionHighlightColor: '#4f7cff',
	popupOpacity: 0.9,
	popupFontSize: 14,
	rememberLastPosition: true,
	enableSearchHistory: true,
	searchHistoryLimit: DEFAULT_HISTORY_LIMIT,
	searchHistoryShortcut: DEFAULT_HISTORY_SHORTCUT,
	searchHistory: [],
};

const HIGHLIGHT_COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const MIN_POPUP_FONT_SIZE = 12;
const MAX_POPUP_FONT_SIZE = 20;

export function normalizeSelectionHighlightColor(value: unknown): string {
	return typeof value === 'string' && HIGHLIGHT_COLOR_PATTERN.test(value)
		? value
		: DEFAULT_SETTINGS.selectionHighlightColor;
}

export function normalizePopupFontSize(value: unknown): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return DEFAULT_SETTINGS.popupFontSize;
	}
	return Math.min(
		MAX_POPUP_FONT_SIZE,
		Math.max(MIN_POPUP_FONT_SIZE, Math.round(value)),
	);
}

export class SearchReplaceSettingTab extends PluginSettingTab {
	plugin: SearchReplaceHelperPlugin;

	constructor(app: App, plugin: SearchReplaceHelperPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	override getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: 'Regex by default',
				desc: 'Interpret the search term as a regular expression by default.',
				control: { type: 'toggle', key: 'defaultRegex' },
			},
			{
				name: 'Match case by default',
				desc: 'Make searches case sensitive by default.',
				control: { type: 'toggle', key: 'defaultCaseSensitive' },
			},
			{
				name: 'Selection highlight color',
				desc: 'Choose the color used to highlight the selected search scope.',
				control: {
					type: 'color',
					key: 'selectionHighlightColor',
					defaultValue: DEFAULT_SETTINGS.selectionHighlightColor,
				},
			},
			{
				name: 'Popup opacity',
				desc: 'Opacity of the floating window. Increase for better legibility.',
				control: {
					type: 'slider',
					key: 'popupOpacity',
					min: 0.6,
					max: 1,
					step: 0.05,
				},
			},
			{
				name: 'Popup font size',
				desc: 'Adjust the font size of the floating window.',
				control: {
					type: 'slider',
					key: 'popupFontSize',
					min: MIN_POPUP_FONT_SIZE,
					max: MAX_POPUP_FONT_SIZE,
					step: 1,
					defaultValue: DEFAULT_SETTINGS.popupFontSize,
					displayFormat: (value) => `${value}px`,
				},
			},
			{
				name: 'Remember popup position',
				desc: 'Reopen the floating window at its last position within the session.',
				control: { type: 'toggle', key: 'rememberLastPosition' },
			},
			{
				name: 'Remember find and replace history',
				desc: 'Record each find and replace combo so you can reuse it later.',
				control: { type: 'toggle', key: 'enableSearchHistory' },
			},
			{
				name: 'History entries to keep',
				desc: `How many recent combos to keep. Favorites are never dropped.`,
				control: {
					type: 'slider',
					key: 'searchHistoryLimit',
					min: MIN_HISTORY_LIMIT,
					max: MAX_HISTORY_LIMIT,
					step: 1,
					defaultValue: DEFAULT_HISTORY_LIMIT,
					displayFormat: (value) => String(value),
				},
			},
			{
				name: 'History shortcut',
				desc: 'Keyboard shortcut that opens the history picker, e.g. Alt+H.',
				control: {
					type: 'text',
					key: 'searchHistoryShortcut',
					defaultValue: DEFAULT_HISTORY_SHORTCUT,
					placeholder: DEFAULT_HISTORY_SHORTCUT,
				},
			},
		];
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Regex by default')
			.setDesc('Interpret the search term as a regular expression by default.')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.defaultRegex)
					.onChange(async (value) => {
						this.plugin.settings.defaultRegex = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Match case by default')
			.setDesc('Make searches case sensitive by default.')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.defaultCaseSensitive)
					.onChange(async (value) => {
						this.plugin.settings.defaultCaseSensitive = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Selection highlight color')
			.setDesc('Choose the color used to highlight the selected search scope.')
			.addColorPicker((colorPicker) =>
				colorPicker
					.setValue(this.plugin.settings.selectionHighlightColor)
					.onChange(async (value) => {
						this.plugin.settings.selectionHighlightColor =
							normalizeSelectionHighlightColor(value);
						this.plugin.controller.updateAppearance();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Popup opacity')
			.setDesc('Opacity of the floating window. Increase for better legibility.')
			.addSlider((slider) =>
				slider
					.setLimits(0.6, 1, 0.05)
					.setValue(this.plugin.settings.popupOpacity)
					.onChange(async (value) => {
						this.plugin.settings.popupOpacity = value;
						this.plugin.controller.updateAppearance();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Popup font size')
			.setDesc('Adjust the font size of the floating window.')
			.addSlider((slider) =>
				slider
					.setLimits(MIN_POPUP_FONT_SIZE, MAX_POPUP_FONT_SIZE, 1)
					.setValue(this.plugin.settings.popupFontSize)
					.onChange(async (value) => {
						this.plugin.settings.popupFontSize = normalizePopupFontSize(value);
						this.plugin.controller.updateAppearance();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Remember popup position')
			.setDesc('Reopen the floating window at its last position within the session.')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.rememberLastPosition)
					.onChange(async (value) => {
						this.plugin.settings.rememberLastPosition = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl).setName('History').setHeading();

		new Setting(containerEl)
			.setName('Remember find and replace history')
			.setDesc('Record each find and replace combo so you can reuse it later.')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableSearchHistory)
					.onChange(async (value) => {
						this.plugin.settings.enableSearchHistory = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('History entries to keep')
			.setDesc('How many recent combos to keep. Favorites are never dropped.')
			.addSlider((slider) =>
				slider
					.setLimits(
						MIN_HISTORY_LIMIT,
						MAX_HISTORY_LIMIT,
						1,
					)
					.setValue(this.plugin.settings.searchHistoryLimit)
					.onChange(async (value) => {
						this.plugin.settings.searchHistoryLimit =
							normalizeHistoryLimit(value);
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('History shortcut')
			.setDesc(
				'Keyboard shortcut that opens the history picker. Use "Alt+H" syntax; a modifier is required. Obsidian\'s key syntax is also accepted, e.g. "Mod+Shift+H".',
			)
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_HISTORY_SHORTCUT)
					.setValue(this.plugin.settings.searchHistoryShortcut)
					.onChange(async (value) => {
						const normalized = normalizeHistoryShortcut(value);
						this.plugin.settings.searchHistoryShortcut = normalized;
						if (normalized !== value) {
							text.setValue(normalized);
						}
						this.plugin.controller.updateAppearance();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Clear history')
			.setDesc(
				'Remove every saved combo, including favorites. Search text is stored in this vault\'s plugin data.',
			)
			.addButton((button) =>
				button
					.setButtonText('Clear')
					.onClick(async () => {
						await this.plugin.clearSearchHistory();
					}),
			);
	}
}