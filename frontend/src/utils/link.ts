/**
 * Safely opens a link inside the Telegram client or falls back to window.open.
 * Uses tg.openTelegramLink for internal Telegram URLs and tg.openLink for external URLs.
 */
export function openLink(url: string) {
  try {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      if (url.startsWith('https://t.me/') || url.startsWith('tg:')) {
        if (typeof tg.openTelegramLink === 'function') {
          tg.openTelegramLink(url);
          return;
        }
      } else {
        if (typeof tg.openLink === 'function') {
          tg.openLink(url);
          return;
        }
      }
    }
  } catch (e) {
    console.warn('Error opening link via Telegram WebApp SDK:', e);
  }
  
  // Fallback for standard browsers
  window.open(url, '_blank');
}
