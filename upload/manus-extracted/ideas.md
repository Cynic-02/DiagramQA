# AR2-DDCQG Design Philosophy

## Chosen Design Direction: **Precision Intelligence**

### Design Movement
**Bauhaus meets Contemporary Tech** — Functional minimalism with high-contrast, geometric precision. Inspired by Linear, Vercel, and Arc Browser. Emphasizes clarity, hierarchy, and purposeful motion.

### Core Principles
1. **Restrained Elegance**: Generous whitespace, high-contrast typography, minimal ornamentation. Every pixel serves function.
2. **Progressive Disclosure**: Complex agent states revealed through layered interactions, not overwhelming the interface.
3. **Motion as Communication**: Transitions and animations signal state changes (agent handoff, verification pass/fail), not decoration.
4. **Technical Authenticity**: Design reflects the actual complexity of the system—the UI is honest about what's happening behind the scenes.

### Color Philosophy
- **Primary**: Deep slate (`#0F172A`) for backgrounds and text — technical, trustworthy, reduces eye strain for diagram-heavy work
- **Accent**: Vibrant cyan (`#06B6D4`) for agent status, active states, and CTAs — signals energy and progress
- **Secondary**: Soft gray (`#F1F5F9`) for cards, panels, and secondary surfaces
- **Status Colors**: 
  - Idle: `#64748B` (muted slate)
  - Running: `#06B6D4` (cyan pulse)
  - Done: `#10B981` (emerald)
  - Flagged: `#F59E0B` (amber)

### Layout Paradigm
**Asymmetric Sidebar + Content Flow**
- Left sidebar: Pipeline stages (not generic nav) with live status indicators
- Main content: Full-width, breathing room between sections
- Hero: 3D canvas confined to top, transitions to flat 2D below
- No centered grids; content aligns to natural reading flow

### Signature Elements
1. **Agent Status Badges**: Animated indicators (pulse, glow, slide) that show which agent is active
2. **Glass Panels**: Subtle glassmorphism for active stage in sidebar (backdrop blur, semi-transparent border)
3. **Geometric Dividers**: SVG wave/diagonal transitions between sections, reinforcing the diagram-to-knowledge-graph concept

### Interaction Philosophy
- **Instant Feedback**: Button presses scale (0.97), hover states change opacity
- **State Transitions**: Agent handoff triggers smooth fade + slide animations
- **Verification Loop**: Visual prominence—pass/fail states use color + motion, not just text
- **Collapsible Sidebar**: Icon-only during active run, expands on completion for results review

### Animation Guidelines
- **UI Transitions**: 150–250ms ease-out for dropdowns, modals, panel reveals
- **Agent Status**: Pulse effect (1.5s loop) for running state, instant snap for state changes
- **Page Choreography**: Stagger section entrances by 50ms for cascading reveal
- **Scroll Handoff**: 3D hero opacity fades as user scrolls, flat UI fades in (useScroll + R3F camera sync)
- **Respect Motion Preference**: All animations gated behind `@media (prefers-reduced-motion: no-preference)`

### Typography System
- **Display**: `Geist` (bold, 700) for hero titles and section headers — geometric, modern
- **Body**: `Inter` (400/500) for content and UI labels — clean, readable
- **Monospace**: `Fira Code` for diagram labels and technical output
- **Hierarchy**: 
  - H1: 48px, 700, letter-spacing -0.02em
  - H2: 32px, 600, letter-spacing -0.01em
  - Body: 16px, 400, line-height 1.6
  - Small: 14px, 500, text-muted-foreground

### Brand Essence
**One-liner**: *"Transform diagrams into intelligent assessments—see how AI understands your architecture."*

**Personality**: Technical, transparent, purposeful, forward-thinking

### Brand Voice
- **Headlines**: Action-oriented, specific, avoid filler ("Upload your diagram" not "Welcome")
- **CTAs**: Direct and clear ("Generate Questions" not "Get Started")
- **Microcopy**: Explain *why*, not just *what* ("Processing with Vision Agent..." not "Loading...")
- **Example lines**:
  - "Your diagram is now a knowledge graph"
  - "Verification flagged 2 ambiguities—regenerating..."

### Wordmark & Logo
**Concept**: Abstract node-and-edge icon (no text) — a single node with 3–4 connecting edges, suggesting graph transformation. Rendered in cyan with subtle glow on dark background. Used in header and as favicon.

### Signature Brand Color
**Cyan (`#06B6D4`)** — unmistakably this platform. Used for active states, agent indicators, and CTAs. Contrasts sharply against dark backgrounds, signals energy and intelligence.

---

## Implementation Notes
- Dark mode is default (technical audience, diagram-heavy work)
- Sidebar collapses to icon-only during active pipeline run
- 3D hero uses React Three Fiber with lazy loading and static fallback
- All agent stages are visible in sidebar, creating a visible verification loop (not hidden backend logic)
- Motion is purposeful: state changes trigger animations, not every interaction
