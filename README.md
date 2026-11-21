# devdocs

Static developer hub for **Convesio** — hosting, MCPs, APIs, and payments.

## Design

- Spec: [`docs/superpowers/specs/2026-03-28-convesio-dev-front-design.md`](docs/superpowers/specs/2026-03-28-convesio-dev-front-design.md)
- Implementation plan: [`docs/superpowers/plans/2026-03-28-convesio-dev-front.md`](docs/superpowers/plans/2026-03-28-convesio-dev-front.md)

Both describe the first build. The look has since moved to the vthree design. See Look below.

## Commands

```bash
npm install
npm run dev      # local dev server
npm run build    # static output to dist/
npm run preview  # serve dist/
npm run test     # vitest (site links config)
npm run check    # astro check
```

## Stack

- [Astro](https://astro.build/) (static)
- TypeScript, Vitest
- No animation library. The mesh, product graphics, and scroll reveal are small scripts in `src/scripts/`.

Central navigation and CTA targets live in `src/config/site-links.ts`.

## Look

The page follows the Convesio vthree design: Inter, the navy and white token sets, one colour per product, and the interactive node mesh behind the hero.

- Tokens for both themes live at the top of `src/styles/global.css`.
- Dark is the default. The header toggle switches to light and remembers the choice.
- Mesh weight is set by the constants at the top of `src/scripts/mesh.ts`. `<Mesh density={n} />` overrides the node count where it is placed.
