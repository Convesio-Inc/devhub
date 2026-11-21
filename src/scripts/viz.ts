/* Live product graphic for the Featured API card. Each graphic is a small step machine
   that redraws through a keyed DOM patcher so CSS transitions carry between steps.
   Mount with <div data-viz="pay">. */

type Style = Record<string, string | number>;
type Props = { key?: string | number; style?: Style };
type VNode = { tag: string; props: Props; kids: Child[]; key: string | null };
type Child = VNode | string | number | null;
type Kid = Child | false | undefined | Kid[];

/* ---------- element builder and patcher ---------- */
const UNITLESS: Record<string, true> = { opacity: true, flex: true, fontWeight: true, lineHeight: true, zIndex: true };

function h(tag: string, props: Props | null, ...children: Kid[]): VNode {
	const kids: Child[] = [];
	const add = (list: Kid[]): void => {
		for (const k of list) {
			if (Array.isArray(k)) add(k);
			else kids.push(k === false || k === undefined ? null : k);
		}
	};
	add(children);
	const p = props ?? {};
	return { tag, props: p, kids, key: p.key == null ? null : String(p.key) };
}

function isEl(v: Child): v is VNode {
	return v !== null && typeof v === 'object';
}

function setStyle(el: HTMLElement, was: Style, now: Style): void {
	const style = el.style as unknown as Record<string, string>;
	for (const k in was) if (!(k in now)) style[k] = '';
	for (const k in now) {
		if (was[k] === now[k]) continue;
		const val = now[k];
		style[k] = typeof val === 'number' && !UNITLESS[k] ? `${val}px` : String(val);
	}
}

function create(v: Child): Node {
	if (v === null) return document.createComment('');
	if (!isEl(v)) return document.createTextNode(String(v));
	const el = document.createElement(v.tag);
	setStyle(el, {}, v.props.style ?? {});
	v.kids.forEach((k) => el.appendChild(create(k)));
	return el;
}

function same(a: Child, b: Child): boolean {
	if (a === null || b === null) return a === b;
	if (!isEl(a) || !isEl(b)) return !isEl(a) && !isEl(b);
	return a.tag === b.tag && a.key === b.key;
}

function patch(parent: Node, node: Node, was: Child, now: Child): Node {
	if (!same(was, now)) {
		const fresh = create(now);
		parent.replaceChild(fresh, node);
		return fresh;
	}
	if (now === null) return node;
	if (!isEl(now)) {
		if (String(was) !== String(now)) node.nodeValue = String(now);
		return node;
	}
	const el = node as HTMLElement;
	const prev = was as VNode;
	setStyle(el, prev.props.style ?? {}, now.props.style ?? {});
	patchKids(el, prev.kids, now.kids);
	return node;
}

function patchKids(el: HTMLElement, was: Child[], now: Child[]): void {
	const nodes = Array.from(el.childNodes);
	const keyed = now.length > 0 && now.every((k) => isEl(k) && k.key !== null);
	if (!keyed) {
		for (let i = 0; i < Math.max(was.length, now.length); i++) {
			if (i >= now.length) el.removeChild(nodes[i]);
			else if (i >= was.length) el.appendChild(create(now[i]));
			else patch(el, nodes[i], was[i], now[i]);
		}
		return;
	}
	// Keyed list: drop what left first so the nodes that stay never move.
	const next = now as VNode[];
	const keep = new Set(next.map((k) => k.key));
	const old = new Map<string, { v: VNode; node: Node }>();
	was.forEach((k, n) => {
		if (isEl(k) && k.key !== null && keep.has(k.key)) old.set(k.key, { v: k, node: nodes[n] });
		else el.removeChild(nodes[n]);
	});
	next.forEach((k, n) => {
		const hit = old.get(k.key as string);
		let node: Node;
		if (hit && hit.v.tag === k.tag) {
			node = hit.node;
			setStyle(node as HTMLElement, hit.v.props.style ?? {}, k.props.style ?? {});
			patchKids(node as HTMLElement, hit.v.kids, k.kids);
		} else {
			node = create(k);
			if (hit) el.removeChild(hit.node);
		}
		if (el.childNodes[n] !== node) el.insertBefore(node, el.childNodes[n] ?? null);
	});
}

/* ---------- shared pieces ---------- */
const E = 'cubic-bezier(.2,.6,.2,1)';
const SPRING = 'cubic-bezier(.34,1.56,.64,1)';
const T = `all .5s ${E}`;
const FG = 'var(--fg)';
const FG2 = 'var(--fg2)';
const FG3 = 'var(--fg3)';
const SURF = 'var(--surface)';
const MUTED = 'var(--muted)';
const LINE = 'var(--line)';
const LINE2 = 'var(--line2)';
const OK = 'var(--ok-text)';
const ACC = 'var(--accent-text)';
const CORAL = '#FF6A5B';
const GREEN = '#2BB673';

function d(style: Style, ...kids: Kid[]): VNode {
	return h('div', { style }, ...kids);
}

function dot(c: string, pulse: boolean): VNode {
	return h('span', {
		style: { width: 6, height: 6, borderRadius: '50%', background: c, flex: 'none', transition: T, animation: pulse ? 'cvsPulse 1s ease-in-out infinite' : 'none' },
	});
}

function pop(text: string, color: string): VNode {
	return h('span', { key: text, style: { display: 'inline-block', fontWeight: 500, color, animation: `cvsPop .5s ${SPRING}` } }, text);
}

const CARD: Style = { background: SURF, borderRadius: 10, padding: '12px 14px', width: '100%', maxWidth: 272, fontSize: 13, lineHeight: 1.35, color: FG };

function head(left: string, right: string, color: string): VNode {
	return d(
		{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, paddingBottom: 8, marginBottom: 8, borderBottom: `1px solid ${LINE}` },
		h('span', { style: { fontWeight: 600 } }, left),
		pop(right, color),
	);
}

/* ---------- step renderers ---------- */
type Kind = 'pay';

const STEPS: Record<Kind, number> = { pay: 7 };
const STEP_MS = 1050;
const WRAP: Style = { height: '100%', padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' };

const RENDER: Record<Kind, (s: number) => VNode> = {
	/* A soft decline on one processor, recovered on the next. */
	pay(s) {
		type Status = [label: string, color: string, live: boolean] | null;
		const st: Status[] = [
			s === 1 ? ['Trying', FG, true] : s >= 2 ? ['Soft decline', ACC, false] : null,
			s === 3 ? ['Retrying', FG, true] : s >= 4 ? ['Approved', OK, false] : null,
			null,
		];
		const act = s === 1 ? 0 : s >= 3 ? 1 : -1;
		return d(
			CARD,
			head('Order 1044 · $129.00', s >= 4 ? 'Recovered' : s >= 1 ? 'Routing' : 'New', s >= 4 ? OK : FG2),
			['Stripe', 'PayPal', 'Elavon'].map((name, i) => {
				const status = st[i];
				return h(
					'div',
					{
						key: name,
						style: {
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							padding: '6px 8px',
							borderRadius: 6,
							fontWeight: 500,
							background: act === i ? MUTED : 'transparent',
							color: status ? FG : FG3,
							transform: act === i ? 'scale(1.03)' : 'none',
							transition: `all .5s ${SPRING}`,
						},
					},
					h('span', { style: { display: 'flex', alignItems: 'center', gap: 8 } }, dot(status ? (status[1] === OK ? GREEN : CORAL) : LINE2, !!status && status[2]), name),
					status ? h('span', { key: status[0], style: { fontSize: 12, color: status[1], animation: `cvsPop .5s ${SPRING}` } }, status[0]) : null,
				);
			}),
		);
	},
};

/* ---------- mounting ---------- */
function isKind(v: string | null): v is Kind {
	return v === 'pay';
}

function mount(host: HTMLElement, kind: Kind, still: boolean): void {
	const last = STEPS[kind] - 1;
	// Start on the finished state so a reader with motion off sees the outcome.
	let step = last;
	let on = false;
	let tree = h('div', { style: WRAP }, RENDER[kind](step));
	let node = create(tree);
	host.textContent = '';
	host.appendChild(node);
	if (still) return;

	new IntersectionObserver((es) => (on = es[0].isIntersecting), { threshold: 0.3 }).observe(host);
	setInterval(() => {
		if (!on || document.hidden) return;
		step = (step + 1) % (last + 1);
		const next = h('div', { style: WRAP }, RENDER[kind](step));
		node = patch(host, node, tree, next);
		tree = next;
	}, STEP_MS);
}

export function initViz(): void {
	const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	document.querySelectorAll<HTMLElement>('[data-viz]').forEach((el) => {
		const kind = el.getAttribute('data-viz');
		if (isKind(kind)) mount(el, kind, still);
	});
}
