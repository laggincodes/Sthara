# UI/UX Design System Specification

## 1. Design Philosophy & Aesthetic
**3D Cadastral Intelligence** adopts a high-precision, technical geospatial aesthetic tailored for a high-impact Smart India Hackathon (SIH) live presentation. The user experience is modeled after professional defense, aerospace, and GIS command consoles (such as Sentinel, Cesium ion, and ArcGIS Pro Web), balancing deep analytical density with clean, modern clarity.

Key Tenets:
- **Spatial Immersion First**: The 2D map and 3D WebGL viewport command the center of attention. Analytical controls, validation badges, and property inspector drawers frame the spatial viewport without obscuring coordinates or boundaries.
- **Immediate Live Feedback**: Processing progress, validation alerts, and 3D ULPIN generation are visually communicated with immediate status badges, animated pulses, and color-coded mesh highlights.
- **Zero-Friction Presentation Flow**: A dedicated "Load Demo Parcel" preset enables an evaluator to experience the entire end-to-end pipeline in a single click, without navigating away from the workspace.

---

## 2. Visual Hierarchy & Color Palette

### Theme: Dark-Mode Geospatial Workstation
The application defaults to a sleek, dark-slate theme designed to maximize contrast against WebGL 3D meshes, satellite imagery, and high-visibility alert markers.

```
Base Colors:
- Background Primary:    #0B0F19 (Deep Obsidian Slate)
- Background Secondary:  #111827 (Dark Charcoal Panel)
- Surface Elevated:      #1F2937 (Border / Card Container)
- Border Subtle:         #374151 (Divider Lines)

Brand & Geospatial Accents:
- Primary Accent (Cyan): #06B6D4 (Interactive borders, primary buttons, camera gizmo)
- Parcel Surface (Green):#10B981 (Legal surface boundary line, ground parcel column)
- Stratum Above-Ground:  #38BDF8 (Light Sky Blue translucent floor volumes)
- Stratum Subterranean:  #F59E0B (Amber translucent basement/utility volumes)
- Air Rights Column:     #A855F7 (Purple translucent zoning envelope)

Status & Validation:
- Pass / Compliant:      #22C55E (Emerald Green badge)
- Warning / Advisory:    #EAB308 (Amber Yellow alert)
- Critical Clash/Error:  #EF4444 (Crimson Red highlight wireframe & alert badge)
```

---

## 3. Typography & Spacing

### Typography
- **Primary Body & UI**: `Inter`, `-apple-system`, `sans-serif` (Clean, legible at 11px–14px data-table scale).
- **Monospace & Coordinates**: `JetBrains Mono`, `Fira Code`, `monospace` (Used for Lat/Lon coordinates, 3D ULPIN strings, elevations, and geometric areas).
- **Scale**:
  - Headings (H1/Title): `18px` / `Font-SemiBold` (Compact to maximize screen real estate).
  - Panel Headers (H2): `13px` / `Font-Bold` / `Uppercase` / `Tracking-wider`.
  - Body Text: `13px` / `Font-Regular`.
  - Metadata / Metric Labels: `11px` / `Font-Medium` / `text-slate-400`.
  - Monospace Data Badges: `12px` / `Font-Mono`.

### Spacing & Grid System
- Tight 4px/8px modular scale (`p-2`, `p-3`, `p-4`, `gap-2`, `gap-3`).
- Maximizes screen viewport efficiency so judges can view 2D footprint, 3D extrusion, and validation logs on a single 1080p display without scrolling.

---

## 4. Navigation & Layout Architecture

The MVP deliberately avoids complex multi-page routing. The entire workflow occurs on a unified **Command Workspace (`/`)**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ HEADER: [Logo] 3D Cadastral Intelligence  [Preset Selector ▼] [▶ Run] [AI]  │
├───────────────────┬─────────────────────────────────────────────────────────┤
│ LEFT CONTROL DOCK │ MAIN VIEWPORT STAGE (Split or Fullscreen 2D/3D)        │
│ (Width: 360px)    │                                                         │
│                   │  ┌───────────────────────┬───────────────────────────┐  │
│ 1. Data Ingestion │  │ 2D CADASTRAL MAP      │ 3D VOLUMETRIC VIEWER      │  │
│    - Preset / GeoJSON│  │ - Parcel Boundary (Grn)│ - Interactive R3F Stage   │  │
│                   │  │ - Footprints          │ - Translucent Floors      │  │
│ 2. Validation Log │  │ - CRS: EPSG:32643      │ - Basement Volume (Amber) │  │
│    - Boundary Pass│  │ - Coordinates readout │ - Encroachment Clash (Red)│  │
│    - Overhang Alert│  │                       │ - Exploded View Slider    │  │
│                   │  └───────────────────────┴───────────────────────────┘  │
│ 3. 3D ULPIN Card  ├─────────────────────────────────────────────────────────┤
│    - Selected Unit│ BOTTOM STATUS BAR:                                      │
│    - Vol: 450 m³  │ Active CRS: EPSG:32643 | Geometries: 6 | Pipeline: OK   │
└───────────────────┴─────────────────────────────────────────────────────────┘
```

---

## 5. Screen Components Specification

### 5.1 Header Bar
- **Logo & Title**: "3D Cadastral Intelligence" with a vibrant 3D cube / parcel icon.
- **Dataset Quick Switcher**:
  - Option 1: `Standard Urban Parcel (Compliant)`
  - Option 2: `Commercial Tower with Overhang Encroachment (Violation Demo)`
  - Option 3: `Custom Upload (.geojson)`
- **Run Pipeline Button**: Prominent cyan button with a Play icon and pulse effect when input changes.
- **AI Explanation Action**: Triggers a slide-over modal containing the Gemini-generated plain-English brief.

### 5.2 Left Control Dock (Width: 360px, Fixed)
Composed of three collapsible, vertically stacked accordion panels:

1. **Layer & Ingestion Panel**:
   - Displays uploaded parcel summary (Parcel ID, total area in $m^2$, number of building structures).
   - Visibility toggles for 2D Parcel, 3D Shell, Individual Floors, Basement, and Clash Highlighting.
2. **Validation Panel**:
   - Summary card: Total Checks Passed (e.g., `3/4`), Status: `CLASH DETECTED` (Amber/Red).
   - Expandable check items:
     - `PARCEL_CONTAINMENT`: `PASSED` (Green checkmark).
     - `VERTICAL_OVERHANG`: `FAILED` (Red warning icon: "Floor 3 overhang exceeds parcel column by 1.4m on East boundary").
     - `HEIGHT_RESTRICTION`: `PASSED` (Within 30m zoning limit).
   - Action: "Highlight Clash in 3D" (focuses camera on the violating geometry).
3. **3D Property & ULPIN Inspector**:
   - Displays real-time selection metadata when a user clicks any volume in the 3D scene or 2D map:
     - **Prototype 3D ULPIN**: Copyable monospace badge (e.g., `IND-CAD-TS09W12A-ABV-0030-0060-FL01`).
     - **Stratum**: `Above Ground (Floor 1)`
     - **Vertical Elevation**: $+3.0m$ to $+6.0m$ AMSL
     - **Computed Volume**: $432.50\text{ m}^3$
     - **Footprint Area**: $144.16\text{ m}^2$
     - **Status**: `Legally Registered`

### 5.3 Main Viewport Stage (Dynamic Split-Screen)
- **Toggle Controls**:
  - `[Split 2D/3D]` (Default): Left 40% is 2D Map, Right 60% is 3D WebGL.
  - `[2D Only]`: Fullscreen 2D map.
  - `[3D Only]`: Fullscreen 3D volumetric space.

#### 5.3.1 2D Map Area
- **Library**: MapLibre GL or Leaflet with CartoDB Dark Matter / OpenStreetMap tiles.
- Vector layers:
  - Base parcel boundary drawn with emerald green border and light green fill.
  - Building footprint drawn with white stroke and translucent fill.
  - Crosshair showing parcel centroid with live Lat/Lon coordinates on hover.
  - Scale bar and north compass arrow.

#### 5.3.2 3D Viewer Area (React Three Fiber)
- **Stage**: Infinite dark grid floor with subtle radial gradient.
- **Lighting**: Ambient light + two directional key lights casting crisp directional shadows.
- **Controls**: Smooth OrbitControls (rotate, pan, zoom) with damping and bounding constraints.
- **Volumetric Meshes**:
  - Surface Parcel Column: Dashed vertical corner pillars rising to municipal height limit.
  - Building Unit Meshes: Semi-transparent stratified blocks. Clicking triggers a cyan selection halo.
  - Encroachment Mesh: Striped, pulsating red wireframe marking the exact 3D volume that extends past the boundary.
- **Floor Exploder Slider**:
  - Floating HUD slider on top-right of 3D viewport.
  - Dragging from `0%` to `100%` smoothly separates building floor slabs along the vertical axis, exposing inner volume geometry.

### 5.4 Bottom Status Bar (Height: 28px)
- Displays system telemetry:
  - Backend API: `Connected (FastAPI :8000)`
  - Active CRS: `EPSG:32643 (WGS 84 / UTM Zone 43N)`
  - Active Dataset: `Commercial_Parcel_402.geojson`
  - Render Performance: `60 FPS | 1,420 Vertices`

---

## 6. Primary MVP User Journey Interaction Flow

```
[1. User Selects Preset Demo]
          │
          ▼
[2. Click "Run Cadastral Pipeline"]
          │
          ├──> Loading Indicator: "Reprojecting CRS... Extruding Volumes... Validating Boundaries..." (<1 sec)
          │
          ▼
[3. Simultaneous Viewport Population]
          ├── 2D Map renders legal boundary & building footprint
          ├── 3D Viewer renders volumetric floors & basement
          └── Validation Panel flashes "1 Clash Detected"
          │
          ▼
[4. Inspect Spatial Clash]
          ├── User clicks "Highlight Clash in 3D"
          └── Camera smoothly zooms to Floor 3; red overhang mesh pulses
          │
          ▼
[5. Inspect 3D Unit & ULPIN]
          ├── User clicks Floor 2 volume mesh
          └── Inspector displays "IND-CAD-TS09W12A-ABV-0030-0060-FL02" with volume metrics
          │
          ▼
[6. Exploded View Demonstration]
          └── User adjusts vertical slider to explode floors and inspect stratified ownership
```

---

## 7. Responsive Behavior & Presentation Mode
- **Optimized for 1920×1080 and 1366×768 Presentation Displays**: All primary controls, dual viewports, and validation outputs fit within standard 16:9 projector resolutions without requiring vertical page scrolling.
- **Collapsible Sidebar**: Sidebar can be collapsed via a toggle button to grant 100% screen width to the 3D scene during full-screen interactive walkthroughs.
