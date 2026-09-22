# Ingredient component sections

## Build
- Add optional ingredient section-heading rows using the same familiar “Add section heading” pattern as Method.
- Let ingredient rows and headings be reordered with drag handles; headings will not show amount or unit fields.
- Render grouped ingredient sections on the recipe page while preserving the current single list for simple recipes.
- Keep existing saved recipes and serving-size scaling fully compatible, and remove empty ingredient rows/headings when saving.

## Technical details
- Extend the ingredient data shape with an optional section-heading marker rather than changing existing recipes.
- Add small parsing helpers so form and display logic share one representation.
- Verify TypeScript and the add/edit recipe flow after implementation.
