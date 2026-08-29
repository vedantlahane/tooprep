# Frontend UI Language

This document describes the visual and interaction language used across the Tooprep frontend. It is intended as a practical reference for designers, developers, and contributors building new UI in the app.

## 1. Design intent

The product uses a clean, high-trust academic dashboard aesthetic:

- calm and precise rather than playful
- structured around learning progress and feedback clarity
- strong emphasis on readability, hierarchy, and confidence signals
- minimal visual noise with color used for meaning, not decoration

The interface reads like a modern assessment and analytics dashboard: calm surfaces, measurable progress, and subtle emphasis on action states.

## 2. Core visual foundation

### 2.1 Color system

The app uses a science/learning-oriented palette centered around a blue primary tone and neutral surfaces.

Primary palette:

- Primary: `#0040e0`
- Primary Container: `#2e5bff`
- Primary Fixed: `#dde1ff`
- On Primary: `#ffffff`

Surface palette:

- Background: `#fbf8ff`
- Surface: `#fbf8ff`
- Surface Container: `#ededfa`
- Surface Container Low: `#f3f2ff`
- Surface Container High: `#e7e7f4`
- On Surface: `#191b24`
- On Surface Variant: `#434656`
- Outline: `#747688`

Semantic status colors:

- Aligned: `#10b981`
- Overconfident: `#ef4444`
- Underconfident: `#3b82f6`
- Weak: `#f59e0b`
- Insufficient: `#9ca3af`

Usage guidance:

- Blue = primary action, selected states, trust, information
- Green = positive alignment or success
- Red = risk, overconfidence, error state
- Orange = warning or caution
- Gray = neutral progress or disabled states

### 2.2 Typography

Font stack:

- Sans: `Inter`, system-ui, sans-serif
- Mono: `JetBrains Mono`, monospace

Type scale currently defined in the stylesheet:

- Display: 36px / 44px / 700
- Headline Large: 28px / 36px / 600
- Headline Medium: 20px / 28px / 600
- Body Large: 16px / 24px / 400
- Body Medium: 14px / 20px / 400
- Mono Label: 14px / 20px / 500
- Small Mono Label: 12px / 16px / 500

Usage guidance:

- Titles and page headers use bold high-contrast sizes
- Body text remains readable and neutral
- Numeric values and labels may use mono typography for clarity
- Math content should remain clean and not visually overpower surrounding text

### 2.3 Spacing and layout rhythm

Use a consistent spacing system based on an 8px rhythm:

- `8px` base unit for compact UI spacing
- `12px` for tighter component gaps
- `16px` for standard inner padding and card gaps
- `24px` for section separation
- `32px+` for major panel and page blocks

The UI favors:

- generous whitespace around core content blocks
- balanced padding in cards and panel groups
- a calm dashboard layout with strong alignment and left-to-right reading flow

## 3. Interface patterns

### 3.1 Cards and panels

The interface relies on elevated but restrained cards:

- soft or neutral background surfaces
- clear borders or separation lines where needed
- consistent padding and rounded corners
- predictable content hierarchy inside each panel

Use cards for:

- topic summaries
- performance stats
- evaluation sections
- profile or user status blocks

### 3.2 Status and confidence indicators

Confidence and performance states are expressed as simple, legible indicators:

- colored dot + label patterns
- semantic meaning tied to status, not decoration
- strong iconography for quick scanning

The app defines dedicated status classes such as:

- aligned
- overconfident
- underconfident
- weak
- insufficient

These should be reused consistently across dashboard, practice, and insights screens.

### 3.3 Buttons and actions

Primary actions should feel clear and confident:

- high-contrast blue primary buttons for major tasks
- neutral secondary surfaces for less urgent actions
- clear hover/pressed states through consistent color and density changes
- not overly saturated or playful in appearance

Avoid decorative button styling that competes with the analytics nature of the app.

### 3.4 Forms and data entry

Forms should remain minimal and structured:

- labels above fields where possible
- clear validation feedback
- low clutter and predictable grouping
- strong spacing to reduce input fatigue

This product values clarity over visual intensity in forms, especially around assessment or onboarding flows.

## 4. Interaction language

### 4.1 Motion

The UI uses restrained motion, mainly for content reveal and subtle feedback:

- fade-in transitions for content entry
- soft pulse animation for attention states such as urgency/time pressure
- minimal movement to avoid visual noise

Animation guidance:

- keep transitions short and smooth
- avoid heavy bouncing or exaggerated motion
- use animation to communicate state change, not to attract attention for its own sake

### 4.2 Scroll and density

The app includes custom scrollbar styling and a `no-scrollbar` utility to support dense dashboard views without visual clutter. The UI should maintain readability in long content areas and avoid overwhelming users with excessive panel density.

## 5. Accessibility and readability

The visual system is designed to support functional clarity and scanning. Recommended principles:

- maintain contrast between text and surfaces
- use color as a complement to labels, not as the only signal
- keep text sizes readable across mobile and desktop breakpoints
- preserve structured hierarchy for headings, labels, and data values

## 6. Desktop and mobile behavior

The interface should behave consistently across sizes:

- desktop: denser dashboard layouts with larger sections and supported multi-column grouping
- mobile: simplified stacks, tighter spacing, and clearer vertical rhythm

Typography scales already include mobile-friendly headline sizing, which should be used for smaller layouts.

## 7. Design system summary

In one sentence: the frontend uses a precise, calm, data-driven visual language built around trust, learning feedback, and strong hierarchy.

Core values:

- clarity
- trust
- precision
- structure
- readable analytics

## 8. Implementation notes for contributors

When creating a new frontend component, follow this default pattern:

1. Use the existing theme tokens instead of arbitrary colors.
2. Prefer spacing and typography utilities already defined in the stylesheet.
3. Use semantic status colors to represent learning states.
4. Keep layouts consistent with dashboard card patterns.
5. Favor readability and controlled motion over decorative styling.
6. Respect the established visual identity instead of creating ad hoc styles.

This ensures the UI remains coherent across the app as it grows.
