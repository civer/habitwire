/**
 * Shared color palette used across the application.
 * Used in habit and category forms for color selection.
 */
export const presetColors = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#6b7280' // gray
] as const

export type PresetColor = typeof presetColors[number]

export function useColors() {
  return {
    presetColors
  }
}
