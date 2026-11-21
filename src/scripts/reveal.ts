/* Blocks marked data-reveal rise in once as they enter view. data-reveal="stagger"
   reveals each child in turn. The hidden state lives in global.css under html.js. */

const STEP_MS = 110;
const MAX_STEPS = 5;

export function initReveal(): void {
	const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const delays = new Map<Element, number>();

	document.querySelectorAll('[data-reveal]').forEach((el) => {
		if (el.getAttribute('data-reveal') === 'stagger') {
			// The stagger tops out at the sixth item so long grids do not keep readers waiting.
			Array.from(el.children).forEach((kid, i) => delays.set(kid, Math.min(i, MAX_STEPS) * STEP_MS));
		} else {
			delays.set(el, 0);
		}
	});

	if (still || !('IntersectionObserver' in window)) {
		delays.forEach((_, el) => el.classList.add('is-in'));
		return;
	}

	const io = new IntersectionObserver(
		(entries) => {
			for (const en of entries) {
				if (!en.isIntersecting) continue;
				io.unobserve(en.target);
				const el = en.target as HTMLElement;
				const delay = delays.get(el) ?? 0;
				el.style.setProperty('--reveal-delay', `${delay}ms`);
				el.classList.add('is-revealing', 'is-in');
				setTimeout(() => el.classList.remove('is-revealing'), 1100 + delay);
			}
		},
		{ threshold: 0.08 },
	);
	delays.forEach((_, el) => io.observe(el));
}
