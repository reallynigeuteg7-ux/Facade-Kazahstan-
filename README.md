# Facade Kazahstan — Vercel
Next.js website, catalogue, Alem questionnaire, generated preliminary SVG drawings, and private owner CRM.

## Deployment
Set production environment variables:
- TURSO_DATABASE_URL and TURSO_AUTH_TOKEN: connected Turso database.
- ALEM_API_KEY and ALEM_MODEL: server-only Alem integration.
- CRM_PASSWORD_HASH: salt and scrypt hash separated by a colon.
- CRM_SESSION_SECRET: random signing secret, at least 32 characters.

Run scripts/migrate.mjs against the intended database before deployment.
Build with pnpm build. Deploy with Vercel CLI from this directory.
The owner dashboard is /admin and requires the owner password.
Never commit .env files, local databases or password handoff files.

Existing site data is transferred separately and verified by matching every source column.
Drawings are preliminary dimensioned sketches and require specialist approval before manufacture.

## Drawing template revision 2
`/admin/templates` contains 22 parametric models reconstructed from 24 supplied
reference sheets. References 22–24 replace the preliminary models on pages 12,
16 and 20: diagonal cage bin, tree/slot bin, and hexagonal fire bowl. The new
p12 reference is rectangular, replacing the earlier round-bin interpretation.
Both bins have incompatible 330 mm vessels and 350 mm bodies with 40 mm frames;
their vessels are fitted to the clearance and the adjustment is noted in the BOM.
The kit uses reference 9; W/H/D edits affect its bench while the bin and light
keep their separate dimensions. Original PNGs and hashes are unchanged.

`blueprint-2026-pN-v2` has closed extruded panels with traced apertures, stock
sections and product-specific profiles. Three.js displays that geometry in 3D;
the sheet renderer uses a CPU depth buffer to avoid hidden surfaces painting
over foreground parts. SVG sheets embed rasterized product views and vector
dimensions; enlarged contour details remain vector. OBJ exports actual faces,
including the walls of holes. Existing v1 orders retain their pinned geometry.

These are reconstructed drafts, not certified CAD: missing dimensions are
identified in each template, raster contours need tolerance/bridge review,
and fasteners, loads, welds and uncertain source details need specialist checks.
The pipeline is deterministic and does not require a paid image-generation API.

Validation: `node test-solid-blueprints.mjs`, `node test-blueprint-templates.mjs`,
`node test-catalog-photo-models.mjs`, `node test-photo-ethno.mjs`, and `pnpm build`.
