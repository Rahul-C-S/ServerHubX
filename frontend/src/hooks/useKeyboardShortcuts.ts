import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  action: () => void;
  description: string;
}

const defaultShortcuts: ShortcutConfig[] = [];

export function useKeyboardShortcuts(customShortcuts: ShortcutConfig[] = []) {
  const navigate = useNavigate();

  // Navigation shortcuts
  const navigationShortcuts: ShortcutConfig[] = [
    { key: 'd', alt: true, action: () => navigate('/'), description: 'Go to Dashboard' },
    { key: 'o', alt: true, action: () => navigate('/domains'), description: 'Go to Domains' },
    { key: 'a', alt: true, action: () => navigate('/apps'), description: 'Go to Applications' },
    { key: 'b', alt: true, action: () => navigate('/databases'), description: 'Go to Databases' },
    { key: 'm', alt: true, action: () => navigate('/mail'), description: 'Go to Mail' },
    { key: 'f', alt: true, action: () => navigate('/files'), description: 'Go to Files' },
    { key: 't', alt: true, action: () => navigate('/terminal'), description: 'Go to Terminal' },
    { key: 'l', alt: true, action: () => navigate('/logs'), description: 'Go to Logs' },
  ];

  const allShortcuts = [...defaultShortcuts, ...navigationShortcuts, ...customShortcuts];

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      for (const shortcut of allShortcuts) {
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const metaMatch = shortcut.meta ? event.metaKey : !event.metaKey;
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

        if (ctrlMatch && altMatch && shiftMatch && metaMatch && keyMatch) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    },
    [allShortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return allShortcuts;
}

export function useGlobalSearch(onOpen: () => void) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd/Ctrl + K to open search
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        onOpen();
      }
      // Forward slash to open search (when not in input)
      if (event.key === '/' && !(event.target as HTMLElement).tagName.match(/INPUT|TEXTAREA/)) {
        event.preventDefault();
        onOpen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpen]);
}

export function getShortcutDisplay(shortcut: ShortcutConfig): string {
  const parts: string[] = [];
  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.alt) parts.push('Alt');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.meta) parts.push('⌘');
  parts.push(shortcut.key.toUpperCase());
  return parts.join(' + ');
}
