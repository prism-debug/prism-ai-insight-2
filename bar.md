# The bar: Linear

Teardown of Linear's issue list, board, issue detail, project list and filter menu, read from four Mobbin captures (linear.app itself is blocked in this
environment, so motion and hover timing are NOT judged from evidence). Mobbin: issue list `fd1b4d88`, board `fc208a44`, detail `f00cc4fb`, filter menu `ef923b0e`.

**Scope:** Linear is the bar for **craft and density**, not identity. PRISM keeps its lavender canvas, violet accent, amber for Joy and the rounded type from
the approved Figma. A critic compares *how well the mechanisms are executed*, not whether it looks like Linear.

## Mechanisms (each checkable by looking)

1. **Tone, not elevation.** Three neutral tones (sidebar ground, content ground, row hover/selection) separated by 1px hairlines. Lists and tables carry no drop
   shadow and no card-in-card. One floating panel (menus, command palette) may carry a soft shadow; nothing else.
2. **Dense and aligned.** UI text 13px, list rows 32–36px tall, three weights at most. Secondary data (owner, date, source, value) sits in fixed right-hand columns,
   muted, vertically aligned across every row, so a column reads like a column.
3. **Lists group by state.** Rows are grouped under collapsible state headers that carry the state icon, the name and a count ("In Progress 2"), with a quiet "+"
   at the right. The header has its own faint tint. State is an icon shape plus colour, not a text pill, in every row.
4. **Display controls top-right.** Every list view has one small cluster of icon buttons at the right of its header (filter, display options, panel toggle).
   Filtering is a typeable menu of properties (Status, Assignee, Priority…) with a count and a clear-filters affordance at the foot.
5. **Detail = content left, Properties rail right.** The record opens with a large plain title and description, then activity beneath. A right rail lists
   Properties as label/value rows, each editable in place. A breadcrumb in the header names the parent and the record, with previous/next.
6. **Keyboard first.** A ⌘K palette overlay searches everything and runs commands; menus show their key hints; selection is a filled row with the one accent;
   focus rings are visible and themed.
7. **One accent, no decoration, short motion.** The accent marks selection, progress and active state only. Empty regions stay empty rather than filled with
   illustration. State changes animate for ≤150ms with an exponential ease-out; nothing animates for decoration.

## How a critic uses this
Put our screenshot next to the Linear capture with labels stripped. Say which executes the seven mechanisms better, and name the single biggest gap.
Binary verdict: PASS only if no mechanism is visibly worse in ours than in Linear's.
