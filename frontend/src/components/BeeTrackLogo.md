# BeeTrackLogo Component

A reusable logo component for the BeeTrack application that provides consistent branding across all pages with responsive sizing.

## Features

-   **Multiple sizes**: Small (sm), Medium (md), Large (lg) with proportional text scaling
-   **Status indicator**: Optional green animated status dot
-   **Text variants**: Full text with subtitle or logo only
-   **Theme support**: Light theme (white text) and dark theme (dark text)
-   **Responsive text**: Text sizes and font weights scale proportionally with logo size
-   **Smart subtitle**: Automatically adjusts text length based on size
-   **Responsive typography**: Font weight adapts to size (semibold for small, bold for medium/large)
-   **Customizable**: Additional CSS classes can be applied to Component

## Usage Examples

### Basic Usage (Default - Medium size with status and text)

```tsx
import BeeTrackLogo from "@/components/BeeTrackLogo";

<BeeTrackLogo />;
```

### Navigation Bar Logo (Small, compact text)

```tsx
<BeeTrackLogo size="sm" showStatus={false} showText={true} textTheme="dark" />
```

### Hero Section Logo (Large, prominent text)

```tsx
<BeeTrackLogo size="lg" showStatus={true} showText={true} textTheme="light" />
```

### Icon Only (No text)

```tsx
<BeeTrackLogo size="md" showStatus={false} showText={false} />
```

### Mobile Header (Large, dark theme)

```tsx
<BeeTrackLogo
    size="lg"
    showStatus={false}
    showText={true}
    textTheme="dark"
    className="justify-center"
/>
```

## Props

| Prop         | Type                   | Default   | Description                                         |
| ------------ | ---------------------- | --------- | --------------------------------------------------- |
| `size`       | `'sm' \| 'md' \| 'lg'` | `'md'`    | Size variant with proportional text scaling         |
| `showStatus` | `boolean`              | `true`    | Whether to show the green animated status indicator |
| `showText`   | `boolean`              | `true`    | Whether to show the text label and subtitle         |
| `textTheme`  | `'light' \| 'dark'`    | `'light'` | Text color theme (white/light gray or dark gray)    |
| `className`  | `string`               | `''`      | Additional CSS classes for custom styling           |

## Design Specifications

### Logo Structure

-   **Outer container**: Rounded amber gradient background (from-amber-400 to-amber-600)
-   **Inner container**: White semi-transparent background (bg-white/90)
-   **Letter "B"**: Bold amber text, size scales with variant
-   **Status indicator**: Green dot with border, animated pulse effect
-   **Shadow**: Subtle drop shadow for depth

### Color Palette

-   **Amber gradient**: `from-amber-400 to-amber-600`
-   **White overlay**: `bg-white/90`
-   **Status green**: `bg-green-400`
-   **Light theme text**: `text-white` title, `text-slate-300` subtitle
-   **Dark theme text**: `text-gray-900` title, `text-gray-600` subtitle

## Sizes

### Small (sm)

-   **Logo**: 40x40px
-   **Title**: `text-lg` (18px) + `font-semibold` (600 weight)
-   **Subtitle**: `text-xs` (12px) - "Apiary Management" (compact)
-   **Spacing**: 8px gap
-   **Use cases**: Navigation bars, compact layouts

### Medium (md) - Default

-   **Logo**: 56x56px
-   **Title**: `text-2xl` (24px) + `font-bold` (700 weight)
-   **Subtitle**: `text-sm` (14px) - "Professional Apiary Management"
-   **Spacing**: 16px gap
-   **Use cases**: Standard headers, general use

### Large (lg)

-   **Logo**: 64x64px
-   **Title**: `text-3xl` (30px) + `font-bold` (700 weight)
-   **Subtitle**: `text-base` (16px) - "Professional Apiary Management"
-   **Spacing**: 16px gap
-   **Use cases**: Hero sections, mobile headers, prominent displays

## Smart Subtitle Feature

The component automatically adjusts the subtitle text based on size:

-   **Small (sm)**: "Apiary Management" (shorter for compact spaces)
-   **Medium/Large**: "Professional Apiary Management" (full branding)

## Responsive Typography

The component uses intelligent font weight scaling:

-   **Small (sm)**: `font-semibold` (600) - lighter weight for better readability at smaller sizes
-   **Medium/Large**: `font-bold` (700) - heavier weight for prominent display

## Current Usage

This component is currently used in:

-   **LoginPage**: Desktop left panel (md, light theme) and mobile header (lg, dark theme)
-   **RegisterPage**: Desktop left panel (md, light theme) and mobile header (lg, dark theme)
-   **Dashboard**: Header navigation (ready for implementation)

## Migration Benefits

Using this component provides:

-   ✅ **Consistent branding** across all pages
-   ✅ **Responsive scaling** - text and logo scale together proportionally
-   ✅ **Intelligent typography** - font weights adapt to size for optimal readability
-   ✅ **Maintainable design** - single source of truth
-   ✅ **TypeScript support** - fully typed props
-   ✅ **Performance optimized** - lightweight and efficient
-   ✅ **Accessibility ready** - semantic HTML structure

## Customization Examples

### Hover Effects

```tsx
<BeeTrackLogo
    className="hover:scale-105 transition-transform duration-200"
    textTheme="dark"
/>
```

### Custom Spacing

```tsx
<BeeTrackLogo
    className="gap-6" // Override default spacing
    size="lg"
/>
```

### Center Alignment

```tsx
<BeeTrackLogo className="justify-center mx-auto" textTheme="dark" />
```
