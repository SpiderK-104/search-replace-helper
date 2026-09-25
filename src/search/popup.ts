import { CSS_PREFIX } from '../constants';

export interface PopupPoint {
	x: number;
	y: number;
}

export interface PopupHandlers {
	onQueryChange(term: string): void;
	onToggleRegex(enabled: boolean): void;
	onToggleCase(enabled: boolean): void;
	onReplaceCurrent(): void;
	onReplaceAll(): void;
	onNavigate(direction: 1 | -1): void;
	onClose(): void;
	getOpacity(): number;
	getFontSize(): number;
}

export class SearchReplacePopup {
	private readonly root: HTMLElement;
	private readonly findInput: HTMLInputElement;
	private readonly replaceInput: HTMLInputElement;
	private readonly regexButton: HTMLElement;
	private readonly caseButton: HTMLElement;
	private readonly countLabel: HTMLElement;
	private readonly dragHandle: HTMLElement;
	private readonly closeButton: HTMLElement;
	private readonly replaceButton: HTMLElement;
	private readonly replaceAllButton: HTMLElement;
	private readonly handlers: PopupHandlers;

	constructor(handlers: PopupHandlers) {
		this.handlers = handlers;

		this.root = createDiv({ cls: `${CSS_PREFIX}__popup` });
		const header = this.root.createDiv({
			cls: `${CSS_PREFIX}__header`,
		});
		this.dragHandle = header.createSpan({
			cls: `${CSS_PREFIX}__handle draggable`,
			text: 'Find and replace',
		});
		this.closeButton = header.createEl('button', {
			cls: `${CSS_PREFIX}__close`,
			attr: { type: 'button', 'aria-label': 'Close (esc)' },
			text: '×',
		});

		const findRow = this.root.createDiv({ cls: `${CSS_PREFIX}__row` });
		this.findInput = findRow.createEl('input', {
			cls: `${CSS_PREFIX}__input ${CSS_PREFIX}__find`,
			attr: {
				type: 'text',
				placeholder: 'Find…',
				spellcheck: 'false',
				autocapitalize: 'off',
			},
		});
		this.regexButton = findRow.createEl('button', {
			cls: `${CSS_PREFIX}__option`,
			attr: {
				type: 'button',
				title: 'Regular expression',
				'aria-label': 'Regular expression',
			},
			text: '.*',
		});
		this.caseButton = findRow.createEl('button', {
			cls: `${CSS_PREFIX}__option`,
			attr: {
				type: 'button',
				title: 'Match case',
				'aria-label': 'Match case',
			},
			text: 'Aa',
		});

		const replaceRow = this.root.createDiv({ cls: `${CSS_PREFIX}__row` });
		this.replaceInput = replaceRow.createEl('input', {
			cls: `${CSS_PREFIX}__input ${CSS_PREFIX}__replace`,
			attr: {
				type: 'text',
				placeholder: 'Replace…',
				spellcheck: 'false',
				autocapitalize: 'off',
			},
		});
		this.replaceButton = replaceRow.createEl('button', {
			cls: `${CSS_PREFIX}__action`,
			attr: {
				type: 'button',
				title: 'Replace current and jump to next (enter)',
			},
			text: 'Replace',
		});
		this.replaceAllButton = replaceRow.createEl('button', {
			cls: `${CSS_PREFIX}__action`,
			attr: { type: 'button', title: 'Replace all in scope (Shift+Enter)' },
			text: 'Replace all',
		});

		const footer = this.root.createDiv({ cls: `${CSS_PREFIX}__footer` });
		this.countLabel = footer.createSpan({ cls: `${CSS_PREFIX}__count` });
		footer.createSpan({
			cls: `${CSS_PREFIX}__hint`,
			text: 'Enter: replace · ↑ ↓ navigate · Esc: close',
		});

		this.bindEvents();
	}

	private bindEvents(): void {
		this.closeButton.addEventListener('click', () => this.handlers.onClose());
		this.replaceButton.addEventListener('click', () =>
			this.handlers.onReplaceCurrent(),
		);
		this.replaceAllButton.addEventListener('click', () =>
			this.handlers.onReplaceAll(),
		);

		this.regexButton.addEventListener('click', () => {
			const enabled = this.regexButton.hasClass(`${CSS_PREFIX}__option-active`);
			this.setRegex(!enabled);
			this.handlers.onToggleRegex(!enabled);
			this.findInput.focus();
		});
		this.caseButton.addEventListener('click', () => {
			const enabled = this.caseButton.hasClass(`${CSS_PREFIX}__option-active`);
			this.setCase(!enabled);
			this.handlers.onToggleCase(!enabled);
			this.findInput.focus();
		});

		this.findInput.addEventListener('input', () =>
			this.handlers.onQueryChange(this.findInput.value),
		);

		const handleKey = (event: KeyboardEvent): void => {
			if (event.key === 'Enter') {
				event.preventDefault();
				event.stopPropagation();
				if (event.shiftKey) {
					this.handlers.onReplaceAll();
				} else {
					this.handlers.onReplaceCurrent();
				}
			} else if (event.key === 'Escape') {
				event.preventDefault();
				event.stopPropagation();
				this.handlers.onClose();
			} else if (event.key === 'ArrowDown') {
				event.preventDefault();
				event.stopPropagation();
				this.handlers.onNavigate(1);
			} else if (event.key === 'ArrowUp') {
				event.preventDefault();
				event.stopPropagation();
				this.handlers.onNavigate(-1);
			} else if (event.key === 'Tab') {
				event.preventDefault();
				event.stopPropagation();
				if (event.target === this.findInput) {
					this.focusReplace();
				} else {
					this.focusSearch();
				}
			}
		};
		this.findInput.addEventListener('keydown', handleKey);
		this.replaceInput.addEventListener('keydown', handleKey);

		this.initDrag();
	}

	private initDrag(): void {
		this.dragHandle.addEventListener('mousedown', (event) => {
			if (event.button !== 0) {
				return;
			}
			event.preventDefault();
			const startX = event.clientX;
			const startY = event.clientY;
			const startLeft = this.root.offsetLeft;
			const startTop = this.root.offsetTop;

			const onMove = (moveEvent: MouseEvent): void => {
				moveEvent.preventDefault();
				this.place({
					x: startLeft + moveEvent.clientX - startX,
					y: startTop + moveEvent.clientY - startY,
				});
			};
			const onUp = (): void => {
				activeWindow.removeEventListener('mousemove', onMove);
				activeWindow.removeEventListener('mouseup', onUp);
			};
			activeWindow.addEventListener('mousemove', onMove);
			activeWindow.addEventListener('mouseup', onUp);
		});
	}

	show(position?: PopupPoint): void {
		this.setOpacity(this.handlers.getOpacity());
		this.setFontSize(this.handlers.getFontSize());
		// Append first so the panel can be measured, then always give it explicit
		// coordinates. A `position: fixed` element left at `top/left: auto` falls
		// back to its static position, which is *below* Obsidian's full-height
		// `.app-container`; `body` is `overflow: clip` + `contain: strict`, so it
		// gets clipped away and the panel is invisible and unclickable.
		document.body.appendChild(this.root);
		this.place(position ?? this.defaultPosition());
		this.focusSearch();
	}

	private place(position: PopupPoint): void {
		const maxX = Math.max(
			activeWindow.innerWidth - this.root.offsetWidth - 4,
			4,
		);
		const maxY = Math.max(
			activeWindow.innerHeight - this.root.offsetHeight - 4,
			4,
		);
		this.root.style.left = `${Math.min(Math.max(position.x, 4), maxX)}px`;
		this.root.style.top = `${Math.min(Math.max(position.y, 4), maxY)}px`;
	}

	private defaultPosition(): PopupPoint {
		const width = this.root.offsetWidth || 440;
		return {
			x: (activeWindow.innerWidth - width) / 2,
			y: activeWindow.innerHeight * 0.12,
		};
	}

	setOpacity(opacity: number): void {
		this.root.style.setProperty('--sr-helper-opacity', String(opacity));
	}

	setFontSize(fontSize: number): void {
		this.root.style.setProperty('--sr-helper-font-size', `${fontSize}px`);
	}

	hide(): void {
		this.root.remove();
	}

	destroy(): void {
		this.hide();
	}

	getPosition(): PopupPoint {
		return { x: this.root.offsetLeft, y: this.root.offsetTop };
	}

	focusSearch(): void {
		this.findInput.focus();
		this.findInput.select();
	}

	focusReplace(): void {
		this.replaceInput.focus();
		this.replaceInput.select();
	}

	getTerm(): string {
		return this.findInput.value;
	}

	getReplacement(): string {
		return this.replaceInput.value;
	}

	setTerm(term: string): void {
		this.findInput.value = term;
	}

	setReplacement(replacement: string): void {
		this.replaceInput.value = replacement;
	}

	setOptions(regex: boolean, caseSensitive: boolean): void {
		this.setRegex(regex);
		this.setCase(caseSensitive);
	}

	setRegex(enabled: boolean): void {
		this.regexButton.toggleClass(`${CSS_PREFIX}__option-active`, enabled);
	}

	setCase(enabled: boolean): void {
		this.caseButton.toggleClass(`${CSS_PREFIX}__option-active`, enabled);
	}

	setCount(count: string): void {
		this.countLabel.setText(count);
	}
}