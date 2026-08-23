# Authority-edit revision-note validation

## 2026-08-23 verification

The protected `postgis.updateFootprint` contract requires an `editNote` of at least eight characters. The home authority editor now validates this requirement before it can invoke the mutation.

| Input state | Form behavior | API mutation behavior |
|---|---|---|
| Blank note | Shows “Required: at least 8 characters.” | Save path is not invoked for an authenticated administrator. |
| `short` | On blur, shows “Add 3 more characters to the revision note before saving.” | Save path is not invoked for an authenticated administrator. |
| `Verified correction evidence` | Shows “Revision note meets the save requirement.” | The normal administrator-only approval path remains available. |

The browser verification used a real selected Microsoft footprint from the Gandhi Maidan reference area but did not submit a correction, height, ownership value, ULPIN, or cadastral record. The revision-note guard is a client-side usability improvement; server-side Zod validation remains active as the security and integrity backstop.
