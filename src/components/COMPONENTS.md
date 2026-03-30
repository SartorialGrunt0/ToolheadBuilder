**Components & Data: How they work together**

This document explains the roles of the UI components in this project and how they interact with the site's documents (MDX content) and metadata (JSON + loader). Use it as a quick reference when extending the UI or the data model.

**Overview**
- **Purpose**: Components render UI for catalogs, tables, carousels, and individual items using metadata from the `src/data` JSON files and content from `src/content` (MDX). The metadata is loaded, normalized, and exposed to components via `loadMetadata.ts` and collection utilities.

**Component Map**
- **ToolheadBuilder UI**: `ToolheadBuilder.jsx` — orchestrates the builder UI, composes carousels and catalog views, and manages selected toolhead state.
- **ToolheadCarousel / Carousel**: `ToolheadCarousel.astro`, `Carousel.jsx` — present a horizontally scrollable view of featured items. They use `useDragCarousel.js` and `useSwipe.js` for gestures.
- **Catalog pages**: `ToolheadsCatalog.astro`, `ExtrudersCatalog.astro`, `HotendsCatalog.astro`, `ProbesCatalog.astro` — top-level catalog pages that render tile grids and tables by reading metadata collections.
- **Catalog tile grid**: `CatalogTileGrid.astro` — renders a responsive grid of tiles for items (cards with image, title, summary).
- **Tables**: `src/components/archive/ToolheadTable.Astro` (archived), `src/components/archive/ExtruderTable.astro` (archived), `src/components/archive/HotendTable.astro` (archived) — render tabular views with sortable / filterable columns (archived copies).
- **Detail-oriented components**: `ToolheadBuilderOld.jsx` — legacy builder UI. Table components for deep compatibility views are archived under `src/components/archive/`.

**Files & Links**
- Metadata loader: [src/data/loadMetadata.ts](src/data/loadMetadata.ts)
- Data sources: [src/data/toolheads.json](src/data/toolheads.json), [src/data/extruders.json](src/data/extruders.json), [src/data/hotends.json](src/data/hotends.json), [src/data/probes.json](src/data/probes.json)
- Content: [src/content/](src/content/) — MDX pages and subfolders used for documentation and collection-driven pages.
- Components folder: [src/components/](src/components/) — where UI components live.

**Data flow (high level)**
1. Build / server: the project reads metadata files from `src/data` (or generates them from `json_files_from_awesome_repos`).
2. Normalization: `loadMetadata.ts` normalizes fields (ids, titles, slugs, images, categories, compatibility lists) and exports a shape consumable by components.
3. Catalogs/pages: Catalog components import the normalized collections and map them into UI props for grid, table, and carousel components.
4. Detail pages / builder: when a user selects an item (from a tile or table), the builder/detail components read the item's metadata, display images/specs, and may fetch related metadata (compatibility lists) to populate configuration UI.

**How components consume metadata**
- Props: components expect a consistent metadata shape. Typical fields: `id`, `name`/`title`, `slug`, `summary`/`description`, `image`, `category`, `compatibility` (arrays of other item ids), and `specs` (key/value pairs).
- Lookups: tables and builder components often reference other collections via ids in `compatibility`. The loader provides maps keyed by `id`/`slug` for fast lookup.
- Filtering/sorting: catalogs pass user-selected filters into table/grid components. The UI components apply simple JS filters and sorts client-side.

**Filtering components**
- **Purpose**: Filtering components control which items from a collection are visible in a grid, table, or carousel. They present UI controls (search, dropdowns, checkboxes, range sliders, tag chips) and produce a filter state object that the list components use to reduce the dataset.
- **UI controls**: Common controls include a free-text search box (title/summary), category dropdown, multi-select tag/feature checkboxes, numeric range sliders (e.g., price, rating), and toggle switches for boolean specs.
- **Data flow**: The parent page or container (catalog or builder) holds the canonical filter state and passes it down as props to presentational components. Typical flow: user updates a control → parent updates filter state → parent computes filteredItems (or passes filters to child) → UI component renders the filteredItems.
- **Implementation (client-side)**: Keep filter logic pure and composable. Example pattern:

- build a single `applyFilters(items, filters)` function that returns the filtered array.
- call `useMemo(() => applyFilters(items, filters), [items, filters])` in React/Preact components to avoid unnecessary recalculation.

- Example filter function (JS):

- ```js
- function applyFilters(items, { query, categories = [], minRating }) {
-   const q = query ? query.toLowerCase() : '';
-   return items.filter(item => {
-     if (q && !(item.title + ' ' + (item.summary || '')).toLowerCase().includes(q)) return false;
-     if (categories.length && !categories.includes(item.category)) return false;
-     if (minRating && ((item.specs && item.specs.rating) || 0) < minRating) return false;
-     return true;
-   });
- }
- ```

- **Tables / Grids**: For tables with pagination and sorting, apply filters before sorting and paginating. Pass filtered results into the table component or let the table accept a `filters` prop and apply the same `applyFilters` internally for consistency.
- **Performance**: Debounce free-text inputs, memoize filtered results, and avoid re-filtering inside deeply nested renders. For large datasets prefer server-side filtering, an indexed client-side search (Fuse.js), or virtualized lists.
- **Accessibility & UX**: Ensure each filter control has a visible label, provides clear affordances for selected state (chips, counts), and supports keyboard interaction. Provide an explicit "Clear filters" action and show when filters are active.
- **Where in this codebase**: `CatalogTileGrid.astro` expects either pre-filtered `items` or a consistent `filters` contract from its parent pages. Legacy table components (archived) previously provided detailed compatibility table views; check `ToolheadBuilder.jsx` for examples of filter-state lifting and `loadMetadata.ts` for normalized fields used in filter predicates.

**Documents (MDX) and component integration**flatpak override --user --env=FLATPAK_ENABLE_SDK_EXT=node20 com.visualstudio.code

- Content files in `src/content` provide long-form documentation and landing pages. Catalog pages link to these using slugs and frontmatter.
- MDX frontmatter can include metadata (e.g., `title`, `description`, `related`) that components or templates read when generating routes or building index pages.

**Hooks and interactions**
- `useDragCarousel.js` / `useSwipe.js`: small utilities that add pointer/touch drag and swipe support to carousels. Carousel components forward gesture events to update current slide index and emit selection events.
- `ToolheadBuilder.jsx` / `ToolheadBuilderOld.jsx`: manage application state for multi-part assembly. They listen for selection events from lists and carousels and update compatibility checks by looking up metadata relationships.

**Rendering lifecycle (example: selecting a toolhead)**
- User clicks a tile in `CatalogTileGrid.astro` (or a row in a table).
- The click handler emits the `id`/`slug` to the parent builder or page component.
- The parent uses the metadata map (provided by `loadMetadata.ts`) to fetch the full item record.
- The builder component renders the item's details, displays compatible parts (looked up by ids in `compatibility`), and enables UI actions (compare, add to build).

**Extending metadata or components**
- Add fields: update the JSON source in `src/data` and augment `loadMetadata.ts` to normalize new fields.
- Add UI: create a presentational component (e.g., `MyNewSpec.astro`) that accepts the normalized record and register it in the page that needs it.
- Keep contracts: keep the normalized metadata shape stable (`id`, `slug`, `title`, `image`, `compatibility`) to minimize changes needed across components.

**Where to look in the code**
- Catalog rendering: [src/components/CatalogTileGrid.astro](src/components/CatalogTileGrid.astro)
- Carousel + gestures: [src/components/Carousel.jsx](src/components/Carousel.jsx), [src/components/useDragCarousel.js](src/components/useDragCarousel.js), [src/components/useSwipe.js](src/components/useSwipe.js)
- Builder orchestration: [src/components/ToolheadBuilder.jsx](src/components/ToolheadBuilder.jsx), [src/components/ToolheadBuilderOld.jsx](src/components/ToolheadBuilderOld.jsx)
- Metadata sources and loader: [src/data](src/data/)

**Quick troubleshooting**
- If a component shows missing data: confirm the normalized key exists in the JSON and in `loadMetadata.ts`.
- If compatibility lists render empty: ensure ids referenced in `compatibility` match the `id`/`slug` used by the target collection.

If you'd like, I can also:
- add inline example code snippets showing the normalized metadata shape,
- generate a small compatibility visualization component, or
- update `loadMetadata.ts` to export TypeScript types for the normalized records.
