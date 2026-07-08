# UI/UX Design System: FX Analyzer Pro

## Design Identity: "Deep Neo"

A premium, futuristic trading terminal aesthetic combining deep space backgrounds with vibrant neon accents. Think Bloomberg Terminal meets Cyberpunk.

## Design Principles

1. **Futuristic Premium** — High contrast, deep blacks (#030305), vibrant neons
2. **Data Density** — Information-rich without clutter; every pixel earns its place
3. **Dynamic Feedback** — Micro-animations on every state change (signal, trade, price)
4. **Efficiency** — Single-view dashboard for all critical telemetry
5. **Immersive** — Subtle 3D scenes and particle effects that don't distract from data

## Color System

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-primary` | `#030305` | Main background |
| `--bg-card` | `rgba(255,255,255,0.03)` | Card surfaces |
| `--border-subtle` | `rgba(255,255,255,0.06)` | Borders & dividers |
| `--accent-cyan` | `#00f2ff` | Primary accent, bullish |
| `--accent-green` | `#00ff88` | Success, confirmation |
| `--accent-lime` | `#ccff00` | Warning, attention |
| `--accent-red` | `#ff0f42` | Danger, bearish, sell signals |
| `--text-primary` | `#ffffff` | Primary text |
| `--text-secondary` | `rgba(255,255,255,0.6)` | Secondary text |
| `--text-muted` | `rgba(255,255,255,0.35)` | Muted/disabled text |

## Typography

| Role | Font | Weight |
|------|------|--------|
| Display/Headings | Inter | 700-900 (ExtraBold–Black) |
| Body | Inter | 400-600 (Regular–SemiBold) |
| Data/Monospace | JetBrains Mono | 500-700 (Medium–Bold) |

### Size Scale
- Display: 5xl–7xl (48px–72px)
- Headings: 2xl–4xl (24px–36px)
- Body: base–lg (16px–18px)
- Caption/Meta: xs (12px)

## Component Design

### Cards
- **Background:** `rgba(255,255,255,0.03)` with subtle border
- **Border:** `1px solid rgba(255,255,255,0.06)`
- **Border radius:** 16px (rounded-2xl)
- **Hover:** translateY(-4px) + enhanced glow shadow

### Buttons
| Variant | Style |
|---------|-------|
| Primary | Gradient (cyan→green), black text |
| Secondary | Semi-transparent bg, subtle border |
| Ghost | No bg, text only |
| Danger | Red accent border/text |

### Charts
- **Library:** [light-weight-charts](https://tradingview.github.io/lightweight-charts/)
- **Theme:** Dark with neon grid lines
- **Candles:** Bullish = cyan, Bearish = red

### Navigation
- Fixed top bar with backdrop blur
- Right-aligned action items
- Smooth scroll to sections

## Layout

### Dashboard Grid
```
┌──────────────────────────────────────────────┐
│ Ticker Bar (real-time prices across top)     │
├──────────┬───────────────────┬───────────────┤
│ Signal   │ Main Chart        │ Order Panel   │
│ Feed     │ (Candlesticks)    │ (Place trades)│
│          │                   │               │
├──────────┴───────────────────┴───────────────┤
│ Agent Arena (MoE debate visualization)        │
├──────────────────────────────────────────────┤
│ Track Record / Trade History / Analytics      │
└──────────────────────────────────────────────┘
```

### Landing Page
- Full-screen hero with gradient text
- Stats bar (4 agents, 6+ pairs, <2s latency, 24/7)
- Feature cards grid (3-column)
- Architecture diagram
- Quick start guide
- Footer

## Motion Design

### Transitions
- **Page transitions:** 300ms ease-out
- **Card hover:** 300ms ease
- **Signal flashes:** 150ms
- **Modal/panel slide:** 400ms cubic-bezier

### Animations
- Loading skeletons: shimmer effect
- Price updates: subtle pulse
- Signal changes: glow flash
- 3D background: continuous rotation/parallax

## State Flow

```
[Idle] → Analyzing → SignalDetected → WaitingForUser
                                          ↓
                                    [Approve/Reject]
                                          ↓
                                    Executing → OrderPlaced → Idle
                                          ↓
                                       Failed → Idle
```

## Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 768px | Single column stack |
| Tablet | 768–1024px | 2-column grid |
| Desktop | 1024px+ | Full 3-column dashboard |

## Iconography
- **Library:** Lucide React icons
- **Style:** Line-based, consistent 1.5px stroke
- **Size:** 16–24px for UI, 32–48px for feature cards
