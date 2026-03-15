export type ShortcutDefinition = {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  primary?: boolean;
};

type KeyboardLikeEvent = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>;

const normalizeKey = (key: string) => (key.length === 1 ? key.toLowerCase() : key);

const isMacPlatform = () => {
  if (typeof navigator === 'undefined') {
    return false;
  }

  return /Mac|iPhone|iPod|iPad/i.test(navigator.platform);
};

export const isShortcutPressed = (event: KeyboardLikeEvent, shortcut: ShortcutDefinition) => {
  const expectsMacPrimary = shortcut.primary ? isMacPlatform() : false;

  const requiredCtrl = shortcut.primary ? !expectsMacPrimary : !!shortcut.ctrl;
  const requiredMeta = shortcut.primary ? expectsMacPrimary : !!shortcut.meta;

  if (event.ctrlKey !== requiredCtrl) return false;
  if (event.metaKey !== requiredMeta) return false;
  if (event.shiftKey !== !!shortcut.shift) return false;
  if (event.altKey !== !!shortcut.alt) return false;

  return normalizeKey(event.key) === normalizeKey(shortcut.key);
};

export const getShortcutDisplayTokens = (shortcut: ShortcutDefinition) => {
  const isMac = isMacPlatform();
  const tokens: string[] = [];

  if (shortcut.primary) {
    tokens.push(isMac ? 'Cmd' : 'Ctrl');
  } else {
    if (shortcut.ctrl) tokens.push('Ctrl');
    if (shortcut.meta) tokens.push(isMac ? 'Cmd' : 'Meta');
  }

  if (shortcut.shift) tokens.push('Shift');
  if (shortcut.alt) tokens.push(isMac ? 'Option' : 'Alt');

  const normalizedKey = normalizeKey(shortcut.key);
  tokens.push(normalizedKey.length === 1 ? normalizedKey.toUpperCase() : shortcut.key);

  return tokens;
};

export const formatShortcut = (shortcut: ShortcutDefinition) =>
  getShortcutDisplayTokens(shortcut).join(' + ');
