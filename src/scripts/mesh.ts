/* Interactive node mesh behind the hero. Nodes drift, link to near
   neighbours, reach for the pointer, and can be dragged. Colours follow the theme. */

/* One colour per product, in the order of the tokens in global.css.
   On dark each colour is lifted so it holds against the navy. */
const PRODUCT_COLORS = {
	host: { light: '#2D85D8', dark: '#4FA6FF' },
	pay: { light: '#2BB673', dark: '#3EE08F' },
	convert: { light: '#F5A623', dark: '#FFBE3D' },
	protect: { light: '#FF6A5B', dark: '#FF7B6C' },
	operator: { light: '#7C6CF0', dark: '#9B8CFF' },
	platforms: { light: '#2BA8A0', dark: '#3AD6CB' },
};
const PAL = Object.values(PRODUCT_COLORS);

const DENSITY = 123;
const MAX_NODES = 140;
const MIN_NODES = 18;
/* A phone-width canvas shows the mesh only above and below the text, so it gets more nodes. */
const NARROW = 640;
const NARROW_BOOST = 1.6;
const LINK = 188;
const REACH = 200;

/* `hot` nodes carry a product colour. `ci` is its index in PAL. */
type Point = { x: number; y: number; vx: number; vy: number; hot: boolean; ci: number };

function isDark(): boolean {
	return document.documentElement.getAttribute('data-theme') !== 'light';
}

function mesh(c: HTMLCanvasElement, still: boolean): void {
	const ctx = c.getContext('2d');
	if (!ctx) return;
	const density = parseFloat(c.getAttribute('data-mesh') ?? '') || DENSITY;
	const m = { x: -9999, y: -9999 };
	let w = 0;
	let hh = 0;
	let pts: Point[] = [];
	let raf = 0;
	let vis = true;
	let grab: Point | null = null;
	let near = false;
	let rect = c.getBoundingClientRect();

	function seed(): void {
		rect = c.getBoundingClientRect();
		const d = Math.min(2, window.devicePixelRatio || 1);
		w = rect.width;
		hh = rect.height;
		c.width = Math.max(1, w * d);
		c.height = Math.max(1, hh * d);
		ctx!.setTransform(d, 0, 0, d, 0, 0);
		const per = density * (w < NARROW ? NARROW_BOOST : 1);
		const n = Math.min(MAX_NODES, Math.max(MIN_NODES, Math.round(((per * w * hh) / (1920 * 900)) * 1.3)));
		pts = Array.from({ length: n }, (_, i) => ({
			x: Math.random() * w,
			y: Math.random() * hh,
			vx: (Math.random() - 0.5) * 0.4,
			vy: (Math.random() - 0.5) * 0.4,
			hot: i % 3 === 0,
			ci: ((i / 3) | 0) % PAL.length,
		}));
		if (still || !vis) draw();
	}

	function draw(): void {
		raf = 0;
		const g = ctx!;
		const dark = isDark();
		const ink = dark ? '#A5BCD8' : '#224468';
		const pal = PAL.map((c) => (dark ? c.dark : c.light));
		g.clearRect(0, 0, w, hh);

		for (const p of pts) {
			if (p === grab || still) continue;
			const sp = Math.hypot(p.vx, p.vy);
			if (sp > 0.3) {
				p.vx *= 0.97;
				p.vy *= 0.97;
			} else if (sp < 0.1) {
				p.vx += (Math.random() - 0.5) * 0.04;
				p.vy += (Math.random() - 0.5) * 0.04;
			}
			p.x += p.vx;
			p.y += p.vy;
			if ((p.x < -20 && p.vx < 0) || (p.x > w + 20 && p.vx > 0)) p.vx *= -1;
			if ((p.y < -20 && p.vy < 0) || (p.y > hh + 20 && p.vy > 0)) p.vy *= -1;
		}

		// Links are drawn in five bands. The closer two nodes sit, the stronger the line.
		g.lineWidth = 1.25;
		const bands: number[][] = [[], [], [], [], []];
		const link2 = LINK * LINK;
		for (let i = 0; i < pts.length; i++) {
			for (let j = i + 1; j < pts.length; j++) {
				const s = pts[i];
				const q = pts[j];
				const dx = s.x - q.x;
				const dy = s.y - q.y;
				const d2 = dx * dx + dy * dy;
				if (d2 < link2) bands[Math.min(4, Math.floor((1 - Math.sqrt(d2) / LINK) * 5))].push(s.x, s.y, q.x, q.y);
			}
		}
		bands.forEach((seg, k) => {
			if (!seg.length) return;
			g.strokeStyle = `rgba(${dark ? '150,178,210' : '34,68,104'},${(0.1 + k * 0.08).toFixed(2)})`;
			g.beginPath();
			for (let n = 0; n < seg.length; n += 4) {
				g.moveTo(seg[n], seg[n + 1]);
				g.lineTo(seg[n + 2], seg[n + 3]);
			}
			g.stroke();
		});

		// Nodes near the pointer reach for it. Product nodes reach in their own colour.
		for (const p of pts) {
			const d = Math.hypot(p.x - m.x, p.y - m.y);
			if (d >= REACH) continue;
			g.globalAlpha = (1 - d / REACH) * 0.82;
			g.strokeStyle = p.hot ? pal[p.ci] : ink;
			g.beginPath();
			g.moveTo(p.x, p.y);
			g.lineTo(m.x, m.y);
			g.stroke();
			g.globalAlpha = 1;
		}

		for (const p of pts) {
			g.fillStyle = p.hot ? pal[p.ci] : p === grab ? ink : dark ? 'rgba(165,188,216,.86)' : 'rgba(34,68,104,.72)';
			g.beginPath();
			g.arc(p.x, p.y, p === grab ? 6.4 : p.hot ? 6 : 2.8, 0, 6.2832);
			g.fill();
		}

		if (vis && !still) raf = requestAnimationFrame(draw);
	}

	function nearest(): Point | null {
		let best: Point | null = null;
		let bd = 30;
		for (const p of pts) {
			const d = Math.hypot(p.x - m.x, p.y - m.y);
			if (d < bd) {
				bd = d;
				best = p;
			}
		}
		return best;
	}

	function setCursor(v: boolean): void {
		if (v === near) return;
		near = v;
		document.documentElement.style.cursor = v ? (grab ? 'grabbing' : 'grab') : '';
	}

	function move(e: PointerEvent): void {
		rect = c.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		if (grab) {
			grab.vx = (x - grab.x) * 0.35;
			grab.vy = (y - grab.y) * 0.35;
			grab.x = x;
			grab.y = y;
		}
		const inside = x >= 0 && y >= 0 && x <= w && y <= hh;
		m.x = inside || grab ? x : -9999;
		m.y = inside || grab ? y : -9999;
		setCursor(!!grab || (inside && !!nearest()));
		if (still) draw();
	}

	function down(e: PointerEvent): void {
		if (e.target instanceof Element && e.target.closest('a,button,input,textarea,select')) return;
		move(e);
		const p = nearest();
		if (!p) return;
		grab = p;
		near = false;
		setCursor(true);
	}

	function up(): void {
		if (!grab) return;
		grab = null;
		near = true;
		setCursor(false);
	}

	seed();
	new ResizeObserver(seed).observe(c);
	new IntersectionObserver((es) => {
		vis = es[0].isIntersecting;
		if (vis && !raf && !still) raf = requestAnimationFrame(draw);
	}).observe(c);
	window.addEventListener('pointermove', move);
	window.addEventListener('pointerdown', down);
	window.addEventListener('pointerup', up);
	window.addEventListener('pointercancel', up);
	document.addEventListener('selectstart', (e) => {
		if (grab) e.preventDefault();
	});
	document.addEventListener('convesio:theme', () => {
		if (still || !vis) draw();
	});
	if (!still) raf = requestAnimationFrame(draw);
}

export function initMesh(): void {
	const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	document.querySelectorAll<HTMLCanvasElement>('canvas[data-mesh]').forEach((c) => mesh(c, still));
}
