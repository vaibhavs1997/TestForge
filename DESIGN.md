# Current design language

The frontend uses Tailwind CSS with semantic CSS variables in `frontend/src/styles/index.css` and aliases in `frontend/tailwind.config.js`. The dominant direction is a teal-accented, dark/light glass interface over a navy or pale gradient background. This is an extraction of the current UI, not a redesign.

## Tokens and typography

- Primary accent: `--color-primary` `#4fd1c5`; dark/light background and surface, text, secondary text, border, success, warning, and error variables are defined in `styles/index.css`.
- Typography: Inter/system sans; JetBrains Mono/monospace for code. Headings are semibold; API payloads and technical values use monospace.
- Tailwind spacing aliases are `xs` 4px, `sm` 8px, `md` 16px, `lg` 24px, `xl` 32px, `xxl` 48px. Radius aliases are 4/8/12px and full.
- Shared shadows are sm/md/lg/xl; glass surfaces add blur, translucent borders, gradients, and inset highlights.

## Components and states

Use the shared components in `frontend/src/components/ui`: `Button`, `Card`, `Alert`, `Badge`, `EmptyState`, `Spinner`, `Skeleton`, `SelectField`, and `IconButton`. `Button` variants include default, destructive, outline, secondary, ghost, and link; it supports loading and visible-label accessibility. Cards use `theme-glass-card`, rounded-xl, semantic border/surface/text classes. Alerts communicate info/success/warning/error and use `role="alert"`.

Forms use labeled controls, rounded borders, semantic surfaces, inline validation, and password fields where credentials are entered. Tables use shared table components, toolbars, pagination, and virtualization for large data. Dialogs/drawers use the app modal backdrop and focus/ARIA conventions present in existing modules. Loading uses spinners/skeletons; empty and error states use shared components and retry actions.

Navigation is the app shell/sidebar/header pattern in `frontend/src/layouts`; feature screens are module/page based. The landing page has a more decorative variant with teal gradients, floating/shimmer animations, and glass panels. Dark mode is class-based and managed by the theme store. Layouts are mobile-first with responsive Tailwind breakpoints; inspect neighboring pages before adding a new responsive pattern.

Use `lucide-react` icons, `aria-hidden` for decorative icons, semantic HTML, labels, keyboard focus rings, and reduced-motion media-query behavior. Prefer `cn` and existing semantic tokens over raw colors.

## Avoid

- New raw color, spacing, radius, or shadow systems that bypass CSS variables/Tailwind aliases.
- Heavy opaque panels, unrelated gradients, or a separate visual language inside the authenticated app.
- Icon-only controls without an accessible name, missing form labels, or removed focus-visible states.
- New global state for server data that belongs in TanStack Query, or duplicated UI primitives.
- Assuming light and dark modes are identical: existing glass, modal, select, and button styling has explicit mode-specific rules.

The repository is not perfectly uniform: some feature pages use compact one-off Tailwind classes and the landing page intentionally differs from the application shell. Follow the nearest established component and the dominant semantic-token/glass pattern rather than claiming every screen is governed by a complete component system.
