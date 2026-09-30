export interface HotkeyChord {
	ctrl: boolean;
	alt: boolean;
	shift: boolean;
	meta: boolean;
	mod: boolean;
	key: string;
}

type ModifierName = 'ctrl' | 'alt' | 'shift' | 'meta' | 'mod';

const MODIFIER_ALIASES: Record<string, ModifierName> = {
	ctrl: 'ctrl',
	control: 'ctrl',
	shift: 'shift',
	alt: 'alt',
	option: 'alt',
	opt: 'alt',
	cmd: 'meta',
	meta: 'meta',
	command: 'meta',
	super: 'meta',
	win: 'meta',
	// Obsidian's cross-platform modifier: Cmd on macOS, Ctrl elsewhere.
	mod: 'mod',
};

const KEY_ALIASES: Record<string, string> = {
	esc: 'Escape',
	escape: 'Escape',
	del: 'Delete',
	delete: 'Delete',
	ins: 'Insert',
	return: 'Enter',
	enter: 'Enter',
	space: ' ',
	plus: '+',
	minus: '-',
	up: 'ArrowUp',
	down: 'ArrowDown',
	left: 'ArrowLeft',
	right: 'ArrowRight',
};

function normalizeKeyName(name: string): string {
	const alias = KEY_ALIASES[name.toLowerCase()];
	if (alias !== undefined) {
		return alias;
	}
	return name.length === 1 ? name.toLowerCase() : name;
}

export function parseHotkey(value: string): HotkeyChord | null {
	const parts = value
		.split('+')
		.map((part) => part.trim())
		.filter((part) => part.length > 0);
	if (parts.length < 2) {
		return null;
	}
	const chord: HotkeyChord = {
		ctrl: false,
		alt: false,
		shift: false,
		meta: false,
		mod: false,
		key: '',
	};
	for (const part of parts.slice(0, -1)) {
		const modifier = MODIFIER_ALIASES[part.toLowerCase()];
		if (!modifier) {
			return null;
		}
		chord[modifier] = true;
	}
	chord.key = normalizeKeyName(parts[parts.length - 1]!);
	// A bare key without a modifier would fire while the user is typing.
	if (chord.key.length === 0) {
		return null;
	}
	if (!chord.ctrl && !chord.alt && !chord.shift && !chord.meta && !chord.mod) {
		return null;
	}
	return chord;
}

export function matchesHotkey(
	event: KeyboardEvent,
	chord: HotkeyChord,
	isMacOS: boolean,
): boolean {
	// `mod` follows Obsidian's cross-platform convention: Cmd on macOS, Ctrl
	// elsewhere. It claims that key, so it must not also be compared directly.
	const modPressed = isMacOS ? event.metaKey : event.ctrlKey;
	const ctrlMatches =
		chord.mod && !isMacOS ? true : event.ctrlKey === chord.ctrl;
	const metaMatches =
		chord.mod && isMacOS ? true : event.metaKey === chord.meta;
	return (
		ctrlMatches &&
		metaMatches &&
		event.altKey === chord.alt &&
		event.shiftKey === chord.shift &&
		modPressed === chord.mod &&
		normalizeKeyName(event.key) === chord.key
	);
}
