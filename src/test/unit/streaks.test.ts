import { describe, it, expect } from 'vitest'
import { calculateCurrentStreak, calculateStreakStats } from '@server/utils/streaks'
import {
  createHabitConfig,
  generateConsecutiveCheckins,
  generateCheckinsForDates
} from '../utils/test-helpers'

// Test date is fixed to 2025-12-31 (Wednesday) via setup.ts
// Week structure (Monday start):
// - Current week: Mon 29 Dec - Sun 04 Jan
// - Last week: Mon 22 Dec - Sun 28 Dec
// - Week before: Mon 15 Dec - Sun 21 Dec

describe('calculateCurrentStreak', () => {
  describe('DAILY habits (counts days)', () => {
    it('returns 0 for empty checkins', () => {
      const habit = createHabitConfig()
      const result = calculateCurrentStreak([], habit, false)
      expect(result).toBe(0)
    })

    it('returns 1 for checkin today only', () => {
      const habit = createHabitConfig()
      const checkins = generateConsecutiveCheckins('2025-12-31', 1)
      const result = calculateCurrentStreak(checkins, habit, false)
      expect(result).toBe(1)
    })

    it('returns correct streak for consecutive days', () => {
      const habit = createHabitConfig()
      const checkins = generateConsecutiveCheckins('2025-12-31', 5)
      const result = calculateCurrentStreak(checkins, habit, false)
      expect(result).toBe(5)
    })

    it('grace period: streak continues if today not checked yet', () => {
      const habit = createHabitConfig()
      const checkins = generateConsecutiveCheckins('2025-12-30', 5)
      const result = calculateCurrentStreak(checkins, habit, false)
      expect(result).toBe(5)
    })

    it('streak breaks if yesterday was not checked', () => {
      const habit = createHabitConfig()
      const checkins = generateConsecutiveCheckins('2025-12-29', 3)
      const result = calculateCurrentStreak(checkins, habit, false)
      expect(result).toBe(0)
    })
  })

  describe('WEEKLY habits (counts weeks)', () => {
    // Today: Wed 31 Dec 2025
    // Active days: Mon/Wed/Fri (1, 3, 5)
    // Current week (Mon 29 Dec): Mon 29, Wed 31 (today), Fri 02 Jan (future)
    // Last week (Mon 22 Dec): Mon 22, Wed 24, Fri 26
    // Week before (Mon 15 Dec): Mon 15, Wed 17, Fri 19

    it('returns 0 for empty checkins', () => {
      const habit = createHabitConfig({
        frequencyType: 'WEEKLY',
        activeDays: [1, 3, 5]
      })
      const result = calculateCurrentStreak([], habit, false)
      expect(result).toBe(0)
    })

    it('returns 1 week when last week is fully completed (current week in grace)', () => {
      const habit = createHabitConfig({
        frequencyType: 'WEEKLY',
        activeDays: [1, 3, 5] // Mon, Wed, Fri
      })

      // Current week: Mon 29 done (past), Wed 31 (today, grace), Fri 02 Jan (future, grace)
      // Last week fully completed: Mon 22, Wed 24, Fri 26
      const checkins = generateCheckinsForDates([
        '2025-12-29', // Mon (current week - must be checked!)
        '2025-12-26', // Fri (last week)
        '2025-12-24', // Wed
        '2025-12-22' // Mon
      ])

      const result = calculateCurrentStreak(checkins, habit, false)
      // Current week is in grace (today + Fri not done yet), last week complete = 1
      expect(result).toBe(1)
    })

    it('returns 2 weeks when two weeks fully completed (current week in grace)', () => {
      const habit = createHabitConfig({
        frequencyType: 'WEEKLY',
        activeDays: [1, 3, 5]
      })

      // Current week past days must be done for grace period
      const checkins = generateCheckinsForDates([
        '2025-12-29', // Mon (current week)
        // Last week
        '2025-12-26', '2025-12-24', '2025-12-22',
        // Week before
        '2025-12-19', '2025-12-17', '2025-12-15'
      ])

      const result = calculateCurrentStreak(checkins, habit, false)
      expect(result).toBe(2)
    })

    it('current week in grace period (future active days remaining)', () => {
      const habit = createHabitConfig({
        frequencyType: 'WEEKLY',
        activeDays: [1, 3, 5]
      })

      // Current week: Mon 29 done, Wed 31 (today) not done, Fri 02 Jan (future)
      // Last week: all done
      const checkins = generateCheckinsForDates([
        '2025-12-29', // Mon (current week)
        '2025-12-26', '2025-12-24', '2025-12-22' // Last week
      ])

      const result = calculateCurrentStreak(checkins, habit, false)
      // Current week is in grace (today + Fri still possible), last week counts
      expect(result).toBe(1)
    })

    it('current week broken if past active day was missed', () => {
      const habit = createHabitConfig({
        frequencyType: 'WEEKLY',
        activeDays: [1, 3, 5]
      })

      // Current week: Mon 29 NOT done, Wed 31 (today) done
      // Last week: all done
      const checkins = generateCheckinsForDates([
        '2025-12-31', // Wed (today)
        // Mon 29 missing!
        '2025-12-26', '2025-12-24', '2025-12-22' // Last week
      ])

      const result = calculateCurrentStreak(checkins, habit, false)
      // Current week is broken (Mon was missed), streak = 0
      expect(result).toBe(0)
    })

    it('streak breaks when one week has missing day', () => {
      const habit = createHabitConfig({
        frequencyType: 'WEEKLY',
        activeDays: [1, 3, 5]
      })

      // Last week: Wed 24 missing
      const checkins = generateCheckinsForDates([
        '2025-12-26', // Fri
        // Wed 24 missing!
        '2025-12-22' // Mon
      ])

      const result = calculateCurrentStreak(checkins, habit, false)
      expect(result).toBe(0)
    })
  })

  describe('CUSTOM frequency (counts weeks)', () => {
    it('returns 0 for empty activeDays array', () => {
      const habit = createHabitConfig({
        frequencyType: 'WEEKLY',
        activeDays: []
      })

      const checkins = generateConsecutiveCheckins('2025-12-31', 10)
      const result = calculateCurrentStreak(checkins, habit, false)
      expect(result).toBe(0)
    })

    it('weekend only habit - 2 weekends = 2 weeks', () => {
      const habit = createHabitConfig({
        frequencyType: 'CUSTOM',
        activeDays: [0, 6] // Sat, Sun
      })

      // Today is Wed 31 Dec
      // Current week (Mon 29 Dec): Sat 03 Jan, Sun 04 Jan (both future) → grace
      // Last week (Mon 22 Dec): Sat 27, Sun 28
      // Week before (Mon 15 Dec): Sat 20, Sun 21

      const checkins = generateCheckinsForDates([
        '2025-12-28', '2025-12-27', // Last week weekend
        '2025-12-21', '2025-12-20' // Week before weekend
      ])

      const result = calculateCurrentStreak(checkins, habit, false)
      expect(result).toBe(2)
    })
  })

  describe('TARGET habit type', () => {
    it('counts checkin as completed if value >= target', () => {
      const habit = createHabitConfig({
        habitType: 'TARGET',
        targetValue: '10'
      })

      const checkins = generateConsecutiveCheckins('2025-12-31', 3, { value: '10' })
      const result = calculateCurrentStreak(checkins, habit, false)
      expect(result).toBe(3)
    })

    it('does not count checkin if value < target', () => {
      const habit = createHabitConfig({
        habitType: 'TARGET',
        targetValue: '10'
      })

      const checkins = [
        { date: '2025-12-31', skipped: false, value: '5' }, // Below target
        { date: '2025-12-30', skipped: false, value: '10' },
        { date: '2025-12-29', skipped: false, value: '15' }
      ]

      const result = calculateCurrentStreak(checkins, habit, false)
      // Today below target but grace period, yesterday + day before OK
      expect(result).toBe(2)
    })

    it('WEEKLY + TARGET: each active day must meet target', () => {
      const habit = createHabitConfig({
        frequencyType: 'WEEKLY',
        activeDays: [1, 3, 5], // Mon, Wed, Fri
        habitType: 'TARGET',
        targetValue: '5'
      })

      // Current week: Mon 29 meets target
      // Last week: Mon 22 ✓, Wed 24 ✗ (below target), Fri 26 ✓
      const checkins = [
        { date: '2025-12-29', skipped: false, value: '5' }, // Mon (current)
        { date: '2025-12-26', skipped: false, value: '10' }, // Fri
        { date: '2025-12-24', skipped: false, value: '3' }, // Wed - below target!
        { date: '2025-12-22', skipped: false, value: '5' } // Mon
      ]

      const result = calculateCurrentStreak(checkins, habit, false)
      // Last week incomplete (Wed didn't meet target) → streak = 0
      expect(result).toBe(0)
    })
  })

  describe('skipped checkins', () => {
    it('skipped counts as completed when skippedBreaksStreak=false', () => {
      const habit = createHabitConfig()
      const checkins = [
        { date: '2025-12-31', skipped: true, value: null },
        { date: '2025-12-30', skipped: false, value: null },
        { date: '2025-12-29', skipped: false, value: null }
      ]

      const result = calculateCurrentStreak(checkins, habit, false)
      expect(result).toBe(3)
    })

    it('skipped breaks streak when skippedBreaksStreak=true', () => {
      const habit = createHabitConfig()
      const checkins = [
        { date: '2025-12-31', skipped: true, value: null },
        { date: '2025-12-30', skipped: false, value: null },
        { date: '2025-12-29', skipped: false, value: null }
      ]

      const result = calculateCurrentStreak(checkins, habit, true)
      // Today skipped with flag=true → grace period, check yesterday
      expect(result).toBe(2)
    })

    it('skipped in middle breaks streak when skippedBreaksStreak=true', () => {
      const habit = createHabitConfig()
      const checkins = [
        { date: '2025-12-31', skipped: false, value: null },
        { date: '2025-12-30', skipped: true, value: null },
        { date: '2025-12-29', skipped: false, value: null }
      ]

      const result = calculateCurrentStreak(checkins, habit, true)
      expect(result).toBe(1)
    })
  })

  describe('weekStartsOn setting', () => {
    it('Monday start (default): week is Mon-Sun', () => {
      const habit = createHabitConfig({
        frequencyType: 'WEEKLY',
        activeDays: [1, 5], // Mon, Fri
        weekStartsOn: 1
      })

      // With Monday start, week of 31 Dec is Mon 29 - Sun 04 Jan
      // Current week: Mon 29 (must be done for grace), Fri 02 Jan (future)
      // Last week: Mon 22 - Sun 28 (Mon 22, Fri 26)
      const checkins = generateCheckinsForDates([
        '2025-12-29', // Mon (current week)
        '2025-12-26', // Fri (last week)
        '2025-12-22' // Mon (last week)
      ])

      const result = calculateCurrentStreak(checkins, habit, false)
      expect(result).toBe(1)
    })

    it('Sunday start: week is Sun-Sat', () => {
      const habit = createHabitConfig({
        frequencyType: 'WEEKLY',
        activeDays: [0, 6], // Sun, Sat
        weekStartsOn: 0
      })

      // With Sunday start, week of 31 Dec (Wed) is Sun 28 - Sat 03 Jan
      // That week: Sun 28 (past), Sat 03 Jan (future) → need Sun 28
      // Previous week: Sun 21 - Sat 27 (Sun 21, Sat 27)
      const checkins = generateCheckinsForDates([
        '2025-12-28', // Sun (current week, past)
        '2025-12-27', '2025-12-21' // Previous week
      ])

      const result = calculateCurrentStreak(checkins, habit, false)
      // Current week: Sun 28 done, Sat 03 Jan future → grace
      // Previous week: both done → 1
      expect(result).toBe(1)
    })
  })
})

describe('calculateStreakStats', () => {
  describe('DAILY habits', () => {
    it('returns zeros for empty checkins', () => {
      const habit = createHabitConfig()
      const result = calculateStreakStats([], habit, false)

      expect(result.currentStreak).toBe(0)
      expect(result.longestStreak).toBe(0)
      expect(result.totalCheckins).toBe(0)
      expect(result.completionRate).toBe(0)
    })

    it('calculates correct stats for simple streak', () => {
      const habit = createHabitConfig({
        createdAt: new Date('2025-12-26')
      })

      const checkins = generateConsecutiveCheckins('2025-12-31', 6)
      const result = calculateStreakStats(checkins, habit, false)

      expect(result.currentStreak).toBe(6)
      expect(result.longestStreak).toBe(6)
      expect(result.totalCheckins).toBe(6)
      expect(result.totalExpectedDays).toBe(6)
      expect(result.completionRate).toBe(100)
    })

    it('tracks longest streak separately from current', () => {
      const habit = createHabitConfig({
        createdAt: new Date('2025-12-21')
      })

      // Gap in the middle: 3 days current, miss 2, then 5 days old
      const checkins = generateCheckinsForDates([
        '2025-12-31', '2025-12-30', '2025-12-29', // current: 3
        // gap: 28, 27
        '2025-12-26', '2025-12-25', '2025-12-24', '2025-12-23', '2025-12-22' // old: 5
      ])

      const result = calculateStreakStats(checkins, habit, false)

      expect(result.currentStreak).toBe(3)
      expect(result.longestStreak).toBe(5)
    })

    it('calculates completion rate correctly', () => {
      const habit = createHabitConfig({
        createdAt: new Date('2025-12-21')
      })

      // 11 expected days (Dec 21-31), 8 checkins
      const checkins = generateCheckinsForDates([
        '2025-12-31', '2025-12-30', '2025-12-29', '2025-12-28',
        '2025-12-27', '2025-12-26', '2025-12-25', '2025-12-24'
      ])

      const result = calculateStreakStats(checkins, habit, false)

      expect(result.totalExpectedDays).toBe(11)
      expect(result.totalCheckins).toBe(8)
      expect(result.completionRate).toBe(73)
    })
  })

  describe('WEEKLY habits (week-based streaks)', () => {
    it('counts weeks for streak, days for completion rate', () => {
      const habit = createHabitConfig({
        frequencyType: 'WEEKLY',
        activeDays: [1, 3, 5], // Mon, Wed, Fri
        createdAt: new Date('2025-12-15')
      })

      // Current week: Mon 29 must be done for grace period
      // Two full weeks completed before
      const checkins = generateCheckinsForDates([
        '2025-12-29', // Mon (current week - needed for grace)
        // Week 22-28 Dec: Mon 22, Wed 24, Fri 26
        '2025-12-26', '2025-12-24', '2025-12-22',
        // Week 15-21 Dec: Mon 15, Wed 17, Fri 19
        '2025-12-19', '2025-12-17', '2025-12-15'
      ])

      const result = calculateStreakStats(checkins, habit, false)

      expect(result.currentStreak).toBe(2) // 2 completed weeks (current is in grace)
      expect(result.longestStreak).toBe(2)
      expect(result.totalCheckins).toBe(7) // 6 from two weeks + Mon 29
    })

    it('longest streak tracks completed weeks', () => {
      const habit = createHabitConfig({
        frequencyType: 'WEEKLY',
        activeDays: [1, 5], // Mon, Fri
        createdAt: new Date('2025-12-01')
      })

      // Week 22-28 Dec: Fri 26 ✓, Mon 22 ✗ → INCOMPLETE (breaks streak)
      // Week 15-21 Dec: Fri 19 ✓, Mon 15 ✓ → complete
      // Week 08-14 Dec: Fri 12 ✓, Mon 08 ✓ → complete
      // Week 01-07 Dec: Fri 05 ✓, Mon 01 ✓ → complete
      // → Longest streak: 3 weeks (01-07, 08-14, 15-21)
      const checkins = generateCheckinsForDates([
        '2025-12-26', // Week 22-28: only Fri (Mon 22 missing!)
        '2025-12-19', '2025-12-15', // Week 15-21: complete
        '2025-12-12', '2025-12-08', // Week 08-14: complete
        '2025-12-05', '2025-12-01' // Week 01-07: complete
      ])

      const result = calculateStreakStats(checkins, habit, false)

      expect(result.currentStreak).toBe(0) // Last week broken
      expect(result.longestStreak).toBe(3) // Three weeks in a row before
    })
  })

  describe('createdAt boundary', () => {
    it('uses createdAt as boundary when no earlier checkins', () => {
      const habit = createHabitConfig({
        createdAt: new Date('2025-12-28')
      })

      const checkins = generateCheckinsForDates([
        '2025-12-31', '2025-12-30', '2025-12-29', '2025-12-28'
      ])

      const result = calculateStreakStats(checkins, habit, false)

      expect(result.totalExpectedDays).toBe(4)
      expect(result.totalCheckins).toBe(4)
      expect(result.completionRate).toBe(100)
    })

    it('backfilled checkins extend the expected range', () => {
      const habit = createHabitConfig({
        createdAt: new Date('2025-12-28')
      })

      const checkins = generateCheckinsForDates([
        '2025-12-31', '2025-12-30', '2025-12-29', '2025-12-28',
        '2025-12-27', '2025-12-26' // backfilled
      ])

      const result = calculateStreakStats(checkins, habit, false)

      expect(result.totalExpectedDays).toBe(6)
      expect(result.totalCheckins).toBe(6)
      expect(result.completionRate).toBe(100)
    })
  })

  describe('TARGET habits', () => {
    it('only counts checkins meeting target', () => {
      const habit = createHabitConfig({
        habitType: 'TARGET',
        targetValue: '100',
        createdAt: new Date('2025-12-28')
      })

      const checkins = [
        { date: '2025-12-31', skipped: false, value: '150' },
        { date: '2025-12-30', skipped: false, value: '50' }, // Below target
        { date: '2025-12-29', skipped: false, value: '100' },
        { date: '2025-12-28', skipped: false, value: '200' }
      ]

      const result = calculateStreakStats(checkins, habit, false)

      expect(result.totalExpectedDays).toBe(4)
      expect(result.totalCheckins).toBe(3)
      expect(result.completionRate).toBe(75)
    })
  })
})
