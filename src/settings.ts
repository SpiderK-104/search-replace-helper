import { App, PluginSettingTab, Setting } from 'obsidian';
import type { SettingDefinitionItem } from 'obsidian';
import type SearchReplaceHelperPlugin from './main';

export interface SearchReplaceSettings {
	defaultRegex: boolean;
	defaultCaseSensitive: boolean;
	selectionHighlightColor: string;
	popupOpacity: number;
	popupFontSize: number;
	rememberLastPosition: boolean;
}

export const DEFAULT_SETTINGS: SearchReplaceSettings = {
	defaultRegex: false,
	defaultCaseSensitive: false,
	selectionHighlightColor: '#4f7cff',
	popupOpacity: 0.9,
	popupFontSize: 14,
	rememberLastPosition: true,
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
	}
}