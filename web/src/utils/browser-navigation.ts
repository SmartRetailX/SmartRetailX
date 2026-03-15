export function openInBrowserTab(path: string, fallback?: () => void) {
  if (typeof window === 'undefined') {
    fallback?.();
    return;
  }

  const openedWindow = window.open(path, '_blank', 'noopener,noreferrer');

  if (!openedWindow) {
    fallback?.();
  }
}
