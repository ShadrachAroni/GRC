---
status: Implemented
last_updated: 2026-05-26T00:16:00Z
dependencies: []
linked_phases: [Phase-02]
---

# UI Design Tokens & Guidelines

Extracted from the Stitch design system resource `assets/09e85b054f644d4d9ed8db5afaf272fc`.

## Typography System
- **Core Font**: Inter (Legibility in data density)
- **Numerical Data Font**: JetBrains Mono (Tabular numbers alignment)
- **Scale**:
  - `display-lg`: 32px / Bold / Line Height: 40px / Letter Spacing: -0.02em (scales to 24px on mobile)
  - `headline-md`: 24px / SemiBold / Line Height: 32px
  - `headline-sm`: 18px / SemiBold / Line Height: 28px
  - `body-lg`: 16px / Regular / Line Height: 24px
  - `body-md`: 14px / Regular / Line Height: 20px
  - `body-sm`: 13px / Regular / Line Height: 18px
  - `label-caps`: 12px / SemiBold / Line Height: 16px / Letter Spacing: 0.05em / All-Caps
  - `data-mono`: 12px / Medium / Line Height: 16px (JetBrains Mono)

## Color System
- **Structural**:
  - Primary (Deep Navy): `#0F172A`
  - Secondary (Slate Blue): `#334155`
  - Background (Neutral Gray): `#F8FAFC`
  - Surface Card: `#FFFFFF`
  - Surface Border: `#E2E8F0`
- **Semantic Alerts**:
  - Success (Emerald): `#059669`
  - Warning (Amber): `#D97706`
  - Danger (Rose): `#E11D48`
- **Risk Severity Palette**:
  - Critical: `#A32D2D`
  - High: `#854F0B`
  - Medium: `#185FA5`
  - Low: `#3B6D11`

## Layout & Spacing
- **Grid**: 12-column grid desktop (16px gutters, 24px margins)
- **Sidebar Width**: 260px (collapses to icons-only on tablet, bottom navigation bar on mobile)
- **Baseline Spacing**: 4px rhythm
- **Density**: Vertical compact (table row 40-48px)
- **Rounding**:
  - standard inputs, buttons, status chips: 4px (`rounded-md` in custom settings, default Tailwind `rounded-md` is 6px, so explicit mapping is 4px).
  - large containers, heat map cells: 8px (`rounded-lg`).
- **Interactive State Behavior**:
  - No vertical "lift" on hover; instead, subtle background color changes (e.g. White to Slate-50) or 1px primary border toggles.
  - Reduced-motion support in all animations.
