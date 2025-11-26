# 🎨 Mini App Store - Design System & Theme Guide

## Color Palette

### Base Colors
- **Base Background**: `#0B0F19` - Very dark navy / near-black
- **Card Background**: `#12161F` or `#141A24` - Slightly lighter dark gray/navy
- **Primary Text**: `#E5E5E5` - Light grey
- **Secondary Text**: `#A0A4AA` - Soft grey
- **Border/Divider**: `#1F2733` - Very dark grey

### Accent Colors
- **Base Blue**: `#0066FF` - Primary accent
- **Base Blue Soft**: `#0090FF` - Softened variant
- **Purple**: `#855DCD` - Farcaster/hybrid accent
- **Gradient**: `#0066FF` → `#855DCD`

## Typography

- **Heading**: `text-xl font-semibold`
- **Sub-heading**: `text-lg font-medium`
- **Body**: `text-sm font-normal`
- **UI Small**: `text-xs`

## Spacing

- **Page Padding**: `px-4` (mobile) / `px-6` (desktop)
- **Vertical Rhythm**: `space-y-6` between sections
- **Card Grid Gap**: `gap-4`

## Border Radius

- **Cards/Buttons**: `rounded-lg` or `rounded-xl`
- **Input Fields**: `rounded-lg`

## Utility Classes

### Glass Effects
```tsx
<div className="glass-card">...</div>
```

### Card Surfaces
```tsx
<div className="card-surface">...</div>
```

### Glow Effects
```tsx
<div className="glow-base-blue">...</div>
<div className="glow-purple">...</div>
<div className="glow-gradient">...</div>
```

### Hover Glows
```tsx
<div className="hover-glow">...</div>
<div className="hover-glow-purple">...</div>
```

### Text Gradients
```tsx
<h1 className="text-gradient-base">...</h1>
<h1 className="text-gradient-blue">...</h1>
```

### Button Gradients
```tsx
<button className="btn-gradient">...</button>
```

### Spacing Utilities
```tsx
<section className="section-spacing">...</section>
<div className="container-padding">...</div>
```

## Component Patterns

### Cards
- Background: `card-surface` or `glass-card`
- Border: Subtle border with hover glow
- Rounded: `rounded-xl`
- Hover: Lift effect with glow

### Buttons
- Primary: Gradient from blue to purple
- Hover: Enhanced glow effect
- Text: White or light grey

### Navigation
- Background: Dark with subtle blur
- Active link: Accent color with glow
- Hover: Subtle accent highlight

## Best Practices

1. **Never use pure black** - Use `#0B0F19` instead
2. **Maintain contrast** - Ensure text is readable
3. **Use accents sparingly** - Blue/purple for highlights only
4. **Consistent spacing** - Follow the spacing scale
5. **Subtle glows** - Soft, not harsh neon effects
6. **Glassmorphism** - Use for modals and overlays

## Accessibility

- Text contrast meets WCAG AA standards
- Hover states are clear and visible
- Focus states use accent colors
- Touch targets are at least 44px

