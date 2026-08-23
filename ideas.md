# 3D ULPIN-VPM — Design Direction

## Three possible approaches

### 1. Cadastral Blueprint
**Very Brief Intro:** A dark, high-clarity geospatial operations desk inspired by survey plans, terrain models, and precise technical instrumentation. It should make complex vertical property information feel legible, official, and actionable.

**Probability:** 0.07

### 2. Civic Atlas
**Very Brief Intro:** A warm editorial approach that reframes land governance as a human-scale public service, with paper textures, deep inks, and carefully annotated map layers. It would feel transparent and institutionally approachable.

**Probability:** 0.03

### 3. Satellite Monolith
**Very Brief Intro:** A dramatic space-technology control surface built around stellar black, electric aurora, and floating volumetric structures. It would emphasize the system’s advanced sensing capabilities and future-facing scope.

**Probability:** 0.08

---

## Chosen Approach — Cadastral Blueprint

### Design Movement
**Instrumental minimalism** meets **architectural drafting**: a contemporary technical interface that borrows its authority from national survey sheets, CAD overlays, and the calm precision of scientific field instruments.

### Core Principles
1. **Spatial truth before decoration.** Every line, pane, badge, and highlight should clarify location, elevation, status, or hierarchy.
2. **Layered transparency.** The product is fundamentally about stacked, intersecting rights. Glass panels, subtle grid lines, and depth cues should make that intelligible.
3. **Controlled prominence.** Use a mostly restrained dusk palette so status color and selected geometry always have a clear operational purpose.
4. **Always in motion, never busy.** This is an expert tool: map layers glide, views settle, and controls respond immediately without entertainment-first animation.

### Color Philosophy
The canvas is **midnight slate**, representing terrain after sunset and providing the visual quiet needed for dense spatial data. A saturated **survey cyan** signals active mapped geometry and system readiness; mineral green indicates validated topology; clay amber identifies attention-worthy conditions. These accents are deliberately rare, making the interface feel like an instrument panel rather than a decorative dashboard.

### Layout Paradigm
The experience uses a **command-rail composition**, not a conventional centered page. A compact left rail anchors global navigation. The central map and 3D building model form the working field. Floating operational cards push in from the edges only where context is needed. On smaller screens, the rail collapses into a purposeful drawer and the analytics stack flows beneath the active map.

### Signature Elements
1. **Contoured datum grid:** low-contrast dotted latitude/longitude guides and contour-like arcs inside the map field.
2. **Volumetric building blocks:** transparent stacked floor volumes with one strong cyan active selection plane.
3. **Survey-line markers:** numbered fine-line ticks, coordinate readouts, and precise uppercase section labels.

### Interaction Philosophy
Interactions should mirror field exploration. Layer chips toggle context without disrupting the view; selecting a building moves the active elevation plane and updates the property inspector; the main action begins a guided ULPIN generation state. Hover cues are concise, and status changes are communicated through semantic color and short confirmation messages.

### Animation
Use a snappy `cubic-bezier(0.23, 1, 0.32, 1)` easing. The map field fades up on load while building planes appear in a 45 ms vertical stagger. Cards lift by 2 px on hover, layer toggles fade selected states over 160 ms, and panels slide 12 px from their nearest edge over 220 ms. All nonessential motion is disabled under `prefers-reduced-motion`.

### Typography System
**Space Grotesk** provides the precise, engineered display hierarchy; use medium or bold weights for titles and terse labels. **DM Sans** supports descriptive text, tables, and form content at comfortable reading sizes. Coordinate numbers and ULPIN strings use **IBM Plex Mono** at smaller sizes for a survey-instrument feel. Headlines are sentence-case and compressed; data labels are uppercase with broad tracking.

### Brand Essence
**3D ULPIN-VPM is an operational mapping desk for public land authorities to make vertical property rights uniquely identifiable, defensible, and usable.**

**Personality:** precise, grounded, forward-looking.

### Brand Voice
Headlines are concise and evidentiary. CTAs are action-led and specific, while microcopy explains system state in plain operational language.

> “Make every cubic metre accountable.”

> “Validate the volume before issuing the identity.”

### Wordmark & Logo
The mark is an abstract **stacked contour monogram**: three offset survey planes form a hexagonal parcel volume, cut by a single vertical cyan datum line. It is graphic-only with no text, giving it immediate usefulness as the app icon and favicon. The wordmark pairs the mark with a compressed geometric nameplate in Space Grotesk.

### Signature Brand Color
**Datum Cyan — `#2AD4D9`**. This is reserved for active mapped geometry, primary actions, and high-confidence operational state.

## Style Decisions

- The global layout keeps a persistent left-side command rail as the operational spine; the identity, mode, and navigation remain anchored there rather than in a conventional top navigation bar.
- The stacked contour monogram and compressed Space Grotesk nameplate remain visible in primary application chrome on every main view.
- Opening headlines use evidence-led field language, prioritizing pilot status, spatial readiness, and volume accountability over personal greetings.
- Drafting elements such as datum ticks, technical reference codes, and survey-line dividers continue across map, metrics, and validation panels while accent colors retain strict semantic meaning.
