# BhuMap Pattern Review — Original Adaptation Notes

**Reference reviewed:** https://bhumap.vercel.app/ on 24 August 2026. The site identifies itself as an SIH demo prototype and labels its shown records as simulated. Its wording, branding, source code, credentials, imagery, and individual record content will not be reused.

## Reusable interaction patterns

| Observed pattern | Original ULPIN-VPM adaptation | Evidence constraint |
| --- | --- | --- |
| 3D map action strip | Keep clear map actions for focus, fullscreen, layer visibility, and record inspection. | Actions operate only on live PostGIS geometry and optional OSM visual context. |
| Selected-property inspector | Show a compact selection dossier with geometry, area, provenance, evidence level, and next record required. | Do not show unit, ownership, height, or ULPIN fields without supplied authority evidence. |
| Layered workflow | Present Level 1 public footprint, Level 2 verified-height extrusion, and Level 3 official floor-plan/BIM progression. | Each progression stage must stay locked until its evidence is present. |
| Conflict review concept | Provide an actionable evidence-intake route for future topology/conflict review. | No conflict is asserted unless calculated from supplied registered geometry and utility evidence. |
| Role-aware approval concept | Retain existing administrator-authority workflow and audit path. | Protected updates remain authenticated and evidence linked. |
| Ingestion and processing visibility | Surface existing data-intake and validation states rather than copying a simulated queue. | Each state must reflect actual submitted files and validation output. |

## Excluded elements

The following are intentionally excluded: the reference product's name, Government of India visual presentation, public demo credentials, claimed metrics, fixed property identifiers, imagery, and any simulated building, utility, conflict, or ownership record. The current project remains its own DoLR/SIH-oriented product with source-backed public footprints and explicit authority-evidence gates.

## Design direction

The next adaptation should prioritize an original **property action dock** beside the live Cesium stage: inspect the live footprint, focus the camera, review source provenance, open authority evidence intake, and view the next evidence step. The dock should complement—not duplicate—the existing three-level evidence panel.

## Adaptation verification

The original action dock was added to the IIT Patna workspace. **Focus source** focuses the existing matched PostGIS geometry. **Attach height evidence** opens the project's real spatial-evidence intake panel and does not create a height automatically. **Operator access** was browser-verified to open the existing authority workspace when no footprint is selected, and changes to authority review when a selected source footprint is present. Desktop and 396×857 mobile review confirmed that the compact controls remain readable, with the mobile dock keeping its three touch targets above the source-state footer.

A true 390×844 touch harness then verified all three dock actions: focus retained the IIT Patna heading and its four live source layers; evidence intake opened the `Add spatial evidence` panel; and operator access opened the `Operator access` panel. No mutation, authority approval, or inferred evidence was performed by the harness.
