/**
 * The GUI's shape, as the designer's demo defines it.
 *
 * `views.ts` is the single place the product's navigation and data-states are written down.
 * The contract test reads `design/designer-demo/ai-company-os.html` and fails if this file
 * and the demo ever disagree — the shell is not allowed to drift from the locked design.
 */
import { z } from 'zod';

/**
 * NAV = [['team','Team','team'],['tasks',…]] in the demo. Order is the sidebar order.
 *
 * The first six are the designer's demo's NAV, in its order. **`world` is the seventh view and it
 * is not in that demo**: it is the owner's own feature (their demo's NAV starts with it), added on
 * their instruction. `gui-fidelity` keeps the split honest — the six leading ids must still equal
 * the designer's NAV exactly, and `world` must exist in the owner's NAV — so neither source can
 * be edited without this file being re-checked.
 */
export const VIEW_IDS = ['team', 'tasks', 'inbox', 'comms', 'network', 'settings', 'world'] as const;
export const viewId = z.enum(VIEW_IDS);
export type ViewId = z.infer<typeof viewId>;

/** One entry per sidebar item: id, the English label the demo renders, and its icon name. */
export const VIEWS: ReadonlyArray<{ id: ViewId; label: string; labelAr: string; icon: string }> = [
  { id: 'team', label: 'Team', labelAr: 'الفريق', icon: 'team' },
  { id: 'tasks', label: 'Tasks', labelAr: 'المهام', icon: 'task' },
  { id: 'inbox', label: 'Inbox', labelAr: 'الوارد', icon: 'inbox' },
  { id: 'comms', label: 'Conversations', labelAr: 'المحادثات', icon: 'chat' },
  { id: 'network', label: 'Network', labelAr: 'الشبكة', icon: 'network' },
  { id: 'settings', label: 'Settings', labelAr: 'الإعدادات', icon: 'settings' },
  // The owner's demo names it "World Map" and puts it first; here it sits last so the designer's
  // six keep their order and the addition is visibly an addition.
  { id: 'world', label: 'World Map', labelAr: 'خريطة المكتب', icon: 'grid' },
];

/** The demo's `stateViews` map: every view can be forced into one of these states. */
export const DATA_STATES = ['default', 'loading', 'empty', 'error', 'restricted'] as const;
export const dataState = z.enum(DATA_STATES);
export type DataState = z.infer<typeof dataState>;

/** GET /views/:id?state=… — the state simulator the shell and tests both use. */
export const viewStateQuery = z.object({ state: dataState.default('default') });
