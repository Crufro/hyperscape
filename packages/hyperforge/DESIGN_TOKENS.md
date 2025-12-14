# Hyperforge Design Token Reference

## Usage Guide

All components MUST use these semantic tokens. Never hardcode colors like `text-white`, `bg-black/20`, or `text-gray-400`.

## Color Tokens

### Base

- `bg-background` - Page background
- `text-foreground` - Primary text color
- `text-muted` - Secondary text (60% opacity)
- `text-muted-foreground` - Tertiary text (40% opacity)

### Panels & Containers

- `bg-glass-bg` - Glass panel background
- `border-glass-border` - Panel borders

### Interactive States

- `bg-accent` - Accent background (neon-purple)
- `text-accent-foreground` - Text on accent bg
- `border-accent` - Accent borders
- `ring-ring` - Focus rings

### Status Colors

- `text-neon-blue` - Info/Primary actions
- `text-neon-purple` - Processing/Active
- `text-neon-green` - Success
- `text-destructive` - Errors/Delete

### Opacity Modifiers

Use Tailwind's `/` syntax for opacity:

- `bg-foreground/5` - Very subtle overlay
- `bg-foreground/10` - Subtle overlay
- `text-foreground/60` - Muted text

## Examples

### ✅ Correct

```tsx
<div className="bg-glass-bg border-glass-border text-foreground">
  <p className="text-muted">Secondary text</p>
</div>
```

### ❌ Wrong

```tsx
<div className="bg-black/20 border-white/10 text-white">
  <p className="text-gray-400">Secondary text</p>
</div>
```
