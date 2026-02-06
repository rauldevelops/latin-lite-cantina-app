# Latin Lite Style Guide

This document defines the consistent styling patterns used across the Latin Lite application (customer portal and admin interface).

---

## Brand Identity

### Tagline
**"Eat healthy, Feel great!"**

### Brand Voice & Messaging

**Tone:** Direct, motivational, and accessible. Use clear, action-oriented language that inspires healthy lifestyle choices without overly technical jargon.

**Voice Characteristics:**
- Straightforward and honest
- Encouraging and positive
- Health-focused but not preachy
- Friendly and approachable
- Professional but warm

**Writing Guidelines:**
- Use active voice and action verbs
- Keep sentences concise and clear
- Emphasize benefits over features
- Avoid technical jargon unless necessary
- Maintain an optimistic, wellness-focused tone

---

## Color Palette

### Brand Colors

**Tailwind Configuration:**
```js
// Add to tailwind.config.js
colors: {
  'latin-orange': '#faab34',
  'latin-red': '#e63945',
  'latin-charcoal': '#3b3b3b',
}
```

**Primary Colors:**
- **Latin Orange**: `#faab34` (Tailwind: `latin-orange` or `orange-400`) - Primary brand color, main CTAs
- **Latin Red**: `#e63945` (Tailwind: `latin-red` or `red-500`) - Secondary accent, hover states, emphasis
- **Charcoal**: `#3b3b3b` (Tailwind: `latin-charcoal` or `gray-800`) - Primary text color
- **White**: `#FFFFFF` - Primary background
- **Light Gray**: `#F5F5F5` (Tailwind: `gray-50`) - Secondary background

### Neutral Palette
- Gray 50: `#F9FAFB` - Page backgrounds
- Gray 100: `#F3F4F6` - Card backgrounds, subtle dividers
- Gray 200: `#E5E7EB` - Borders, disabled states
- Gray 300: `#D1D5DB` - Borders, inactive elements
- Gray 500: `#6B7280` - Secondary text
- Gray 600: `#4B5563` - Tertiary text
- Gray 700: `#374151` - Labels, form text
- Gray 900: `#111827` - Dark text (use sparingly)

### Status Colors
- **Success/Active**: `bg-green-100 text-green-800`
- **Error/Danger**: `bg-red-100 text-red-800`
- **Warning**: `bg-yellow-100 text-yellow-800`
- **Info/Neutral**: `bg-gray-100 text-gray-600`
- **Special (Purple/Dessert)**: `bg-purple-100 text-purple-800`
- **Special (Amber/Soup)**: `bg-amber-100 text-amber-800`

---

## Typography

### Font Families

**Headings:** Poppins (sans-serif, bold weight)
```tsx
className="font-['Poppins'] font-bold"
```

**Body Text:** Source Sans Pro (sans-serif, regular and bold)
```tsx
className="font-['Source_Sans_Pro']"
```

**Implementation:**
Add to your Next.js layout or `globals.css`:
```tsx
import { Poppins, Source_Sans_Pro } from 'next/font/google'

const poppins = Poppins({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
  variable: '--font-poppins'
})

const sourceSansPro = Source_Sans_Pro({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
  variable: '--font-source-sans'
})
```

### Page Headers
```tsx
<h1 className="text-2xl md:text-3xl font-bold text-latin-charcoal font-['Poppins']">
  Page Title
</h1>
```

### Section Headers
```tsx
<h2 className="text-lg font-semibold mb-4 text-latin-charcoal font-['Poppins']">
  Section Title
</h2>
```

### Body Text
```tsx
<p className="text-latin-charcoal font-['Source_Sans_Pro']">
  Body content
</p>
```

**Text Color Hierarchy:**
- Primary: `text-latin-charcoal` (#3b3b3b)
- Secondary: `text-gray-600`
- Muted: `text-gray-500`

---

## Layout & Containers

### Page Container
```tsx
<div className="min-h-screen bg-gray-50 p-4 md:p-8">
  <div className="max-w-{size} mx-auto">
    {/* content */}
  </div>
</div>
```

**Container Widths:**
- `max-w-6xl` - List pages (menu items, weekly menus, orders)
- `max-w-2xl` - Simple form pages (edit menu item)
- `max-w-7xl` - Complex multi-column pages (order builder)

### Cards & Sections
```tsx
<div className="bg-white shadow rounded-lg p-6">
  {/* content */}
</div>
```

---

## Buttons

**Universal Button Style:** Pill-shaped with uppercase text

### Primary Action
```tsx
<button className="px-6 py-2 bg-latin-orange text-white rounded-full hover:bg-latin-red uppercase font-semibold disabled:opacity-50 transition-colors">
  PRIMARY ACTION
</button>
```

### Secondary Action
```tsx
<button className="px-6 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 uppercase font-semibold transition-colors">
  SECONDARY ACTION
</button>
```

### Success Action
```tsx
<button className="px-6 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 uppercase font-semibold transition-colors">
  SUCCESS ACTION
</button>
```

### Danger Action
```tsx
<button className="px-6 py-2 bg-latin-red text-white rounded-full hover:bg-red-700 uppercase font-semibold transition-colors">
  DELETE
</button>
```

### Quantity Buttons (+ / -)
```tsx
<button className="w-6 h-6 rounded border border-gray-400 bg-white text-gray-700 font-semibold disabled:opacity-30 hover:bg-gray-100">
  +
</button>
```

### Text Links
```tsx
<a className="text-latin-orange hover:text-latin-red transition-colors">
  Link Text
</a>
```

### Back Links
```tsx
<Link href="/path" className="text-latin-orange hover:text-latin-red transition-colors">
  ← Back to Page
</Link>
```

---

## Forms

### Input Fields
```tsx
<input
  type="text"
  className="px-3 py-2 border border-gray-300 rounded-md text-latin-charcoal"
/>
```

For full-width inputs:
```tsx
className="w-full px-3 py-2 border border-gray-300 rounded-md text-latin-charcoal"
```

### Labels
```tsx
<label className="block text-sm font-medium text-gray-700">
  Field Name
</label>
```

### Textareas
```tsx
<textarea
  rows={3}
  className="w-full px-3 py-2 border border-gray-300 rounded-md text-latin-charcoal"
/>
```

### Select Dropdowns
```tsx
<select className="px-3 py-2 border border-gray-300 rounded-md text-latin-charcoal">
  <option>Option 1</option>
</select>
```

### Checkboxes
```tsx
<div className="flex items-center gap-2">
  <input
    type="checkbox"
    className="h-4 w-4 rounded border-gray-300 text-latin-orange focus:ring-latin-orange"
  />
  <label className="text-sm font-medium text-gray-700">
    Checkbox Label
  </label>
</div>
```

---

## Tables

### Table Container
```tsx
<div className="bg-white shadow rounded-lg overflow-hidden">
  <table className="min-w-full divide-y divide-gray-200">
    {/* table content */}
  </table>
</div>
```

### Table Header
```tsx
<thead className="bg-gray-50">
  <tr>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      Column Name
    </th>
  </tr>
</thead>
```

For right-aligned headers:
```tsx
<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
  Actions
</th>
```

### Table Body
```tsx
<tbody className="bg-white divide-y divide-gray-200">
  <tr>
    <td className="px-6 py-4 text-latin-charcoal">
      Cell content
    </td>
  </tr>
</tbody>
```

### Empty State
```tsx
<tr>
  <td colSpan={n} className="px-6 py-4 text-center text-gray-500">
    No items found.
  </td>
</tr>
```

---

## Badges & Status Indicators

### Status Badge Base
```tsx
<span className="px-2 py-1 text-xs rounded-full font-semibold">
  Status
</span>
```

### Color Variants
- **Success/Active/Published**: `bg-green-100 text-green-800`
- **Error/Inactive**: `bg-red-100 text-red-800`
- **Warning/Draft**: `bg-yellow-100 text-yellow-800`
- **Info/Neutral**: `bg-gray-100 text-gray-600`
- **Special (Purple/Dessert)**: `bg-purple-100 text-purple-800`
- **Special (Amber/Soup)**: `bg-amber-100 text-amber-800`

---

## Alerts & Messages

### Error Message
```tsx
<div className="bg-red-100 text-red-700 p-3 rounded mb-4">
  Error message text
</div>
```

### Warning Message
```tsx
<div className="bg-yellow-100 text-yellow-800 p-4 rounded mb-4">
  Warning message text
</div>
```

### Success Message
```tsx
<div className="bg-green-100 text-green-700 p-3 rounded mb-4">
  Success message text
</div>
```

---

## Loading States

### Full Page Loading
```tsx
<div className="min-h-screen flex items-center justify-center">
  <p className="text-latin-charcoal">Loading...</p>
</div>
```

### Inline Loading
```tsx
<div className="text-center text-gray-600">Loading...</div>
```

---

## Spacing

### Common Spacing Patterns
- Section spacing: `space-y-4` or `space-y-6`
- Card padding: `p-4` or `p-6`
- Margin bottom for sections: `mb-4`, `mb-6`, or `mb-8`
- Gap between flex items: `gap-2`, `gap-3`, or `gap-4`
- Generous whitespace: Use padding liberally to create breathing room

---

## Responsive Design

### Header Layout
```tsx
<div className="flex flex-col gap-4 mb-8">
  <h1 className="text-2xl md:text-3xl font-bold text-latin-charcoal font-['Poppins']">
    Title
  </h1>
  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 sm:items-center">
    {/* Responsive controls */}
  </div>
</div>
```

### Grid Layouts
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Grid items */}
</div>
```

---

## Action Bars

### Top Action Bar
```tsx
<div className="flex justify-between items-center mb-8">
  <h1 className="text-3xl font-bold text-latin-charcoal font-['Poppins']">
    Page Title
  </h1>
  <div className="flex gap-3">
    <button className="px-6 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 uppercase font-semibold transition-colors">
      SECONDARY
    </button>
    <button className="px-6 py-2 bg-latin-orange text-white rounded-full hover:bg-latin-red uppercase font-semibold transition-colors">
      PRIMARY
    </button>
  </div>
</div>
```

### Form Action Bar
```tsx
<div className="flex gap-4 pt-4">
  <button
    type="submit"
    className="flex-1 py-2 px-6 bg-latin-orange text-white rounded-full hover:bg-latin-red uppercase font-semibold disabled:opacity-50 transition-colors"
  >
    SAVE CHANGES
  </button>
  <Link
    href="/back"
    className="flex-1 py-2 px-6 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 text-center uppercase font-semibold transition-colors"
  >
    CANCEL
  </Link>
</div>
```

---

## Consistent Patterns

1. **Brand Colors**: Always use Latin Orange (#faab34) for primary actions and Latin Red (#e63945) for hover states
2. **Pill-Shaped Buttons**: All buttons use `rounded-full` with uppercase text
3. **Typography**: Poppins for headings, Source Sans Pro for body text
4. **Responsive Padding**: `p-4 md:p-8` on page containers
5. **Rounded Corners**: `rounded-lg` for cards, `rounded-md` for form inputs
6. **Shadow Hierarchy**: `shadow` for cards/tables, no shadow for nested elements
7. **Text Contrast**: Use `text-latin-charcoal` for primary text on light backgrounds
8. **Hover States**: Always include hover states with `transition-colors` for smooth transitions
9. **Disabled States**: Use `disabled:opacity-50` for disabled buttons
10. **Generous Whitespace**: Embrace padding and spacing for a clean, breathable layout

---

## Implementation Notes

### Tailwind Config
Add custom colors to your `tailwind.config.js`:

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        'latin-orange': '#faab34',
        'latin-red': '#e63945',
        'latin-charcoal': '#3b3b3b',
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        source: ['Source Sans Pro', 'sans-serif'],
      },
    },
  },
}
```

### Font Loading
In your root layout (`app/layout.tsx`):

```tsx
import { Poppins, Source_Sans_Pro } from 'next/font/google'

const poppins = Poppins({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
  variable: '--font-poppins'
})

const sourceSansPro = Source_Sans_Pro({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
  variable: '--font-source-sans'
})

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${poppins.variable} ${sourceSansPro.variable}`}>
      <body className="font-source">{children}</body>
    </html>
  )
}
```

---

**Document Version:** 2.0
**Last Updated:** February 6, 2026
**Based on:** latinlite.com brand guidelines
