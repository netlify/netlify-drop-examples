// Two small enhancements: a theme toggle and a copy-link button. Everything
// here is optional — the page is fully readable with JavaScript turned off,
// and the toolbar stays hidden until this file runs.

const root = document.documentElement;
const STORAGE_KEY = 'theme';

const prefersDark = () =>
  window.matchMedia('(prefers-color-scheme: dark)').matches;

const activeTheme = () =>
  root.dataset.theme || (prefersDark() ? 'dark' : 'light');

const themeToggle = document.getElementById('theme-toggle');
const themeToggleLabel = document.getElementById('theme-toggle-label');

const syncThemeLabel = () => {
  themeToggleLabel.textContent =
    activeTheme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
};

// Restore a previous choice. With nothing stored we leave the attribute off so
// the CSS keeps following the operating system setting.
try {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') {
    root.dataset.theme = stored;
  }
} catch {
  // Private browsing can block storage. Not worth telling anyone about.
}

themeToggle.addEventListener('click', () => {
  root.dataset.theme = activeTheme() === 'dark' ? 'light' : 'dark';
  syncThemeLabel();
  try {
    localStorage.setItem(STORAGE_KEY, root.dataset.theme);
  } catch {
    // See above.
  }
});

const copyButton = document.getElementById('copy-link');
const copyIcon = document.getElementById('copy-link-icon').firstElementChild;
const copyStatus = document.getElementById('copy-status');
let resetCopyTimer;

copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(window.location.href);
    copyIcon.setAttribute('href', '#icon-check');
    copyStatus.textContent = 'Link copied';
  } catch {
    copyStatus.textContent = 'Could not copy the link';
    return;
  }

  clearTimeout(resetCopyTimer);
  resetCopyTimer = setTimeout(() => {
    copyIcon.setAttribute('href', '#icon-copy');
    copyStatus.textContent = '';
  }, 2000);
});

syncThemeLabel();
document.getElementById('toolbar').hidden = false;
