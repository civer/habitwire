/**
 * Shared icon sets used across the application.
 */

/**
 * Icons for habits - used in habit creation and editing.
 */
export const habitIcons = [
  'i-lucide-target',
  'i-lucide-dumbbell',
  'i-lucide-droplet',
  'i-lucide-book-open',
  'i-lucide-bed',
  'i-lucide-pill',
  'i-lucide-apple',
  'i-lucide-footprints',
  'i-lucide-brain',
  'i-lucide-heart',
  'i-lucide-sun',
  'i-lucide-moon',
  'i-lucide-coffee',
  'i-lucide-cigarette-off',
  'i-lucide-music',
  'i-lucide-pencil',
  'i-lucide-code',
  'i-lucide-flame',
  'i-lucide-leaf',
  'i-lucide-star',
  'i-lucide-zap',
  'i-lucide-trophy',
  'i-lucide-smile',
  'i-lucide-sparkles',
  'i-lucide-graduation-cap',
  'i-lucide-palette',
  'i-lucide-camera',
  'i-lucide-dollar-sign',
  'i-lucide-users',
  'i-lucide-home'
] as const

export type HabitIcon = typeof habitIcons[number]

/**
 * Icons for categories - used in category management.
 */
export const categoryIcons = [
  'i-lucide-folder',
  'i-lucide-briefcase',
  'i-lucide-home',
  'i-lucide-heart',
  'i-lucide-star',
  'i-lucide-zap',
  'i-lucide-trophy',
  'i-lucide-target',
  'i-lucide-flame',
  'i-lucide-leaf',
  'i-lucide-sun',
  'i-lucide-moon',
  'i-lucide-dumbbell',
  'i-lucide-brain',
  'i-lucide-book',
  'i-lucide-book-open',
  'i-lucide-graduation-cap',
  'i-lucide-music',
  'i-lucide-palette',
  'i-lucide-camera',
  'i-lucide-code',
  'i-lucide-dollar-sign',
  'i-lucide-users',
  'i-lucide-smile',
  'i-lucide-sparkles',
  'i-lucide-coffee',
  'i-lucide-droplet',
  'i-lucide-pill',
  'i-lucide-apple',
  'i-lucide-footprints'
] as const

export type CategoryIcon = typeof categoryIcons[number]

export function useIcons() {
  return {
    habitIcons,
    categoryIcons
  }
}
