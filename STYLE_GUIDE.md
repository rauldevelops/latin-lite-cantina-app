# Latin Lite Admin UI Style Guide

This document defines the consistent styling patterns used across the admin interface.

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

## Typography

### Page Headers
```tsx
<h1 className="text-2xl md:text-3xl font-bold text-gray-900">
  Page Title
</h1>
```

### Section Headers
```tsx
<h2 className="text-lg font-semibold mb-4">
  Section Title
</h2>
```

### Body Text
- Primary: `text-gray-900`
- Secondary: `text-gray-600`
- Muted: `text-gray-500`

## Forms

### Input Fields
```tsx
<input
  type="text"
  className="px-3 py-2 border border-gray-300 rounded-md text-gray-900"
/>
```

For full-width inputs:
```tsx
className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
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
  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
/>
```

### Select Dropdowns
```tsx
<select className="px-3 py-2 border border-gray-300 rounded-md text-gray-900">
  <option>Option 1</option>
</select>
```

### Checkboxes
```tsx
<div className="flex items-center gap-2">
  <input
    type="checkbox"
    className="h-4 w-4 rounded border-gray-300"
  />
  <label className="text-sm font-medium text-gray-700">
    Checkbox Label
  </label>
</div>
```

## Buttons

### Primary Action
```tsx
<button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
  Primary Action
</button>
```

### Secondary Action
```tsx
<button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
  Secondary Action
</button>
```

### Success Action
```tsx
<button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
  Success Action
</button>
```

### Danger Action
```tsx
<button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
  Delete
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
<a className="text-blue-600 hover:text-blue-800">
  Link Text
</a>
```

### Back Links
```tsx
<Link href="/path" className="text-blue-600 hover:text-blue-800">
  ← Back to Page
</Link>
```

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
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
      Column Name
    </th>
  </tr>
</thead>
```

For right-aligned headers:
```tsx
<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
  Actions
</th>
```

### Table Body
```tsx
<tbody className="bg-white divide-y divide-gray-200">
  <tr>
    <td className="px-6 py-4 text-gray-900">
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

## Badges & Status Indicators

### Status Badge Base
```tsx
<span className="px-2 py-1 text-xs rounded-full">
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

## Loading States

### Full Page Loading
```tsx
<div className="min-h-screen flex items-center justify-center">
  <p>Loading...</p>
</div>
```

### Inline Loading
```tsx
<div className="text-center">Loading...</div>
```

## Spacing

### Common Spacing Patterns
- Section spacing: `space-y-4` or `space-y-6`
- Card padding: `p-4` or `p-6`
- Margin bottom for sections: `mb-4`, `mb-6`, or `mb-8`
- Gap between flex items: `gap-2`, `gap-3`, or `gap-4`

## Responsive Design

### Header Layout
```tsx
<div className="flex flex-col gap-4 mb-8">
  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Title</h1>
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

## Action Bars

### Top Action Bar
```tsx
<div className="flex justify-between items-center mb-8">
  <h1 className="text-3xl font-bold text-gray-900">Page Title</h1>
  <div className="flex gap-3">
    <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
      Secondary
    </button>
    <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
      Primary
    </button>
  </div>
</div>
```

### Form Action Bar
```tsx
<div className="flex gap-4 pt-4">
  <button
    type="submit"
    className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
  >
    Save Changes
  </button>
  <Link
    href="/back"
    className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-center"
  >
    Cancel
  </Link>
</div>
```

## Color Palette

### Primary Colors
- Blue (Primary Action): `blue-600`, `blue-700`, `blue-800`
- Gray (Neutral): `gray-50`, `gray-100`, `gray-200`, `gray-300`, `gray-500`, `gray-600`, `gray-700`, `gray-900`

### Status Colors
- Green (Success): `green-100`, `green-600`, `green-700`, `green-800`
- Red (Danger): `red-100`, `red-600`, `red-700`, `red-800`
- Yellow (Warning): `yellow-100`, `yellow-800`
- Purple (Special): `purple-100`, `purple-600`, `purple-800`
- Amber (Special): `amber-100`, `amber-600`, `amber-800`

## Consistent Patterns

1. **Always use responsive padding**: `p-4 md:p-8` on page containers
2. **Consistent border radius**: `rounded-md` for most elements, `rounded-lg` for cards
3. **Shadow hierarchy**: `shadow` for cards/tables, no shadow for nested elements
4. **Text contrast**: Ensure `text-gray-900` on light backgrounds for readability
5. **Hover states**: Always include hover states for interactive elements
6. **Disabled states**: Use `disabled:opacity-50` for disabled buttons
7. **Focus states**: Browser default focus rings are acceptable
