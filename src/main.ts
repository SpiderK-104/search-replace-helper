import { MarkdownView, Notice, Plugin } from 'obsidian';
import {
	DEFAULT_SETTINGS,
	normalizePopupFontSize,
	normalizeSelectionHighlightColor,
	SearchReplaceSettings,
	SearchReplaceSettingTab,
} from './settings';
import { SearchReplaceController } from './search/controller';

export default class SearchReplaceHelperPlugin extends Plugin {
	settings!: SearchReplaceSettings;
	controller!: SearchReplaceController;

	async onload() {
		await this.loadSettings();

		this.controller = new SearchReplaceController(this);
		this.controller.init();

		this.addCommand({
			id: 'open-find-replace',
			name: 'Find and replace',
			callback: () => {
				if (this.controller.isOpen()) {
					this.controller.close();
					return;
				}
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!view?.editor) {
					new Notice('Open a Markdown note before using find and replace.');
					return;
				}
				try {
					this.controller.open(view.editor);
				} catch (error) {
					console.error(
						'[search-replace-helper] Failed to open Find and replace.',
						error,
					);
					new Notice(
						'Find and replace could not access the current editor. Reload the note and try again.',
					);
				}
			},
		});

		this.addSettingTab(new SearchReplaceSettingTab(this.app, this));
	}

	onunload() {
		this.controller?.destroy();
	}

	async loadSettings() {
		const settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<SearchReplaceSettings>,
		);
		settings.selectionHighlightColor = normalizeSelectionHighlightColor(
			settings.selectionHighlightColor,
		);
		settings.popupFontSize = normalizePopupFontSize(settings.popupFontSize);
		this.settings = settings;
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}