import { App, PluginSettingTab, Setting } from 'obsidian';
import type SearchReplaceHelperPlugin from './main';

export interface SearchReplaceSettings {
	defaultRegex: boolean;
	defaultCaseSensitive: boolean;
	popupOpacity: number;
	rememberLastPosition: boolean;
}

export const DEFAULT_SETTINGS: SearchReplaceSettings = {
	defaultRegex: false,
	defaultCaseSensitive: false,
	popupOpacity: 0.9,
	rememberLastPosition: true,
};

export class SearchReplaceSettingTab extends PluginSettingTab {
	plugin: SearchReplaceHelperPlugin;

	constructor(app: App, plugin: SearchReplaceHelperPlugin) {
		super(app, plugin);
		this.plugin = plugin;
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
			.setName('Popup opacity')
			.setDesc('Opacity of the floating window. Increase for better legibility.')
			.addSlider((slider) =>
				slider
					.setLimits(0.6, 1, 0.05)
					.setValue(this.plugin.settings.popupOpacity)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.popupOpacity = value;
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