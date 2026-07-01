import { format } from 'date-fns'

// Build one slot per calendar day for a daily bar chart, over the window from
// the LATER of (today − rangeDays) and the earliest logged day, through today.
//
// Two design points shared by every bar chart:
//   - Missing days *within* the window are still emitted (value = `fill`), so a
//     day you skipped shows as a gap in the "consistency calendar".
//   - But the window never extends before your first entry: pre-history isn't
//     rendered, so short logging histories fill the axis width instead of
//     piling every real bar up on the right under mislabeled empty slots.
//
// `field`/`goalField` name the columns to read; `fill` is the value for an
// unlogged day — 0 for a floor metric (an honest "you did none"), null for a
// ceiling metric (unknown, so no bar rather than a false "under budget").
// Returns `{ date, value, goal }` per slot.
export function dayBins(rows, today, rangeDays, { field, goalField, fill = null }) {
  if (rows.length === 0) return []

  const byDate = new Map(rows.map((r) => [r.entry_date, r]))
  const end = new Date(today + 'T00:00:00')
  const earliest = new Date(rows.map((r) => r.entry_date).sort()[0] + 'T00:00:00')

  let start
  if (rangeDays == null) {
    start = earliest
  } else {
    start = new Date(today + 'T00:00:00')
    start.setDate(start.getDate() - (rangeDays - 1))
    if (start < earliest) start = earliest // clamp: don't render before day one
  }

  const out = []
  for (const cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
    const r = byDate.get(format(cur, 'yyyy-MM-dd'))
    out.push({ date: new Date(cur), value: r?.[field] ?? fill, goal: r?.[goalField] ?? null })
  }
  return out
}
