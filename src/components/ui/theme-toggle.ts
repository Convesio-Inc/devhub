const STORAGE_KEY = 'convesio-dev-theme';
const THEME_COLOR = { dark: '#0B111E', light: '#FFFFFF' };

type Theme = keyof typeof THEME_COLOR;

function current(): Theme {
	return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

function label(btn: HTMLElement, theme: Theme): void {
	btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
}

export function initThemeToggle(): void {
	const btn = document.getElementById('theme-toggle');
	if (!btn) return;
	label(btn, current());

	btn.addEventListener('click', () => {
		const next: Theme = current() === 'dark' ? 'light' : 'dark';
		document.documentElement.setAttribute('data-theme', next);
		document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[next]);
		try {
			localStorage.setItem(STORAGE_KEY, next);
		} catch {
			// Storage can be blocked. The theme still changes for this visit.
		}
		label(btn, next);
		// The mesh repaints in the new ink when it hears this.
		document.dispatchEvent(new CustomEvent('convesio:theme', { detail: next }));
	});
}
