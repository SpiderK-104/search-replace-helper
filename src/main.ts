import { Plugin } from 'obsidian';
import {
	DEFAULT_SETTINGS,
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
			editorCallback: (editor) => {
				this.controller.open(editor);
			},
			hotkeys: [{ modifiers: ['Alt'], key: 'D' }],
		});

		this.addSettingTab(new SearchReplaceSettingTab(this.app, this));
	}

	onunload() {
		this.controller?.destroy();
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<SearchReplaceSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}