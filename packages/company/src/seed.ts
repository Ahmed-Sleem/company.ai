/**
 * Seed — the designer's own company.
 *
 * Every value here is read from the demo (`design/designer-demo/ai-company-os.html`), in both
 * languages, and `packages/company/test/parity.test.ts` parses that file and fails if any of it
 * drifts. That test is the point: the product is not allowed to quietly show a different company
 * from the one the designer drew.
 *
 * Two things are *not* copied from the demo, deliberately:
 *   · money is moved through `recordRun` (the product's own write path) so the ledger, the cached
 *     counter, the meter and the audit trail cannot disagree — the demo's `spent` values are the
 *     amounts, the runs are how they got there;
 *   · model prices are placeholders until the live registry arrives at P2.
 */
import { eq } from 'drizzle-orm';
import type { Db } from './client.js';
import { recordRun } from './repo.js';
import * as t from './schema.js';

/** The designer's three model lanes, with placeholder prices (see the file header). */
const MODELS = [
  { providerModel: 'gpt-5.2', provider: 'openai', lane: 'strong', displayName: 'GPT-5.2',
    inputCentsPerMTok: 250, outputCentsPerMTok: 1000, contextWindow: 400_000, maxOutputTokens: 128_000 },
  { providerModel: 'claude-sonnet-4.6', provider: 'anthropic', lane: 'balanced', displayName: 'Claude Sonnet 4.6',
    inputCentsPerMTok: 300, outputCentsPerMTok: 1500, contextWindow: 200_000, maxOutputTokens: 64_000 },
  { providerModel: 'qwen3-coder:30b', provider: 'open', lane: 'cheap', displayName: 'Qwen3 Coder 30B (local)',
    inputCentsPerMTok: 0, outputCentsPerMTok: 0, contextWindow: 128_000, maxOutputTokens: 32_000 },
] as const;

/**
 * The demo's roster. `spentCents` is the amount the demo shows; the seed turns it into runs.
 * `manager` is the demo's own field: 'you' is the human owner, otherwise another agent's name.
 */
const ROSTER = [
  { key: 'aria', name: 'Aria', nameAr: 'آريا', role: 'Lead engineer', roleAr: 'رئيسة الهندسة',
    department: 'Engineering', status: 'working', avatar: 0, spentCents: 1250, budgetCents: 4000,
    focus: 'Refining the streaming pipeline', focusAr: 'تحسين مسار معالجة البيانات',
    skills: ['TypeScript', 'System design', 'Testing'], manager: 'you' },
  { key: 'leo', name: 'Leo', nameAr: 'ليو', role: 'Software engineer', roleAr: 'مهندس برمجيات',
    department: 'Engineering', status: 'working', avatar: 2, spentCents: 820, budgetCents: 3000,
    focus: 'Testing the new billing flow', focusAr: 'اختبار نظام الفوترة الجديد',
    skills: ['Node.js', 'Testing', 'APIs'], manager: 'aria' },
  { key: 'zara', name: 'Zara', nameAr: 'زارا', role: 'Data analyst', roleAr: 'محللة بيانات',
    department: 'Engineering', status: 'error', avatar: 3, spentCents: 1890, budgetCents: 2500,
    focus: 'Waiting for analytics access', focusAr: 'بانتظار صلاحية الوصول للتحليلات',
    skills: ['SQL', 'Analytics', 'Python'], manager: 'aria' },
  { key: 'codex', name: 'Codex', nameAr: 'كودكس', role: 'Systems engineer', roleAr: 'مهندس أنظمة',
    department: 'Engineering', status: 'paused', avatar: 10, spentCents: 640, budgetCents: 3500,
    focus: 'Migration is ready for review', focusAr: 'الترحيل جاهز للمراجعة',
    skills: ['Infrastructure', 'Security', 'Automation'], manager: 'aria' },
  { key: 'marcus', name: 'Marcus', nameAr: 'ماركوس', role: 'Marketing lead', roleAr: 'رئيس التسويق',
    department: 'Go to market', status: 'working', avatar: 1, spentCents: 910, budgetCents: 3000,
    focus: 'Shaping the launch story', focusAr: 'إعداد قصة الإطلاق',
    skills: ['Strategy', 'Research', 'Positioning'], manager: 'you' },
  { key: 'chloe', name: 'Chloe', nameAr: 'كلوي', role: 'Content designer', roleAr: 'مصممة محتوى',
    department: 'Go to market', status: 'idle', avatar: 4, spentCents: 160, budgetCents: 2000,
    focus: 'Ready for the next brief', focusAr: 'جاهزة للمهمة التالية',
    skills: ['Writing', 'Content design', 'Editing'], manager: 'marcus' },
  { key: 'sam', name: 'Sam', nameAr: 'سام', role: 'Customer success', roleAr: 'نجاح العملاء',
    department: 'Go to market', status: 'working', avatar: 7, spentCents: 420, budgetCents: 2500,
    focus: 'Putting customer feedback to work', focusAr: 'تحويل ملاحظات العملاء إلى تحسينات',
    skills: ['Support', 'Research', 'Communication'], manager: 'marcus' },
  { key: 'iris', name: 'Iris', nameAr: 'آيريس', role: 'Operations analyst', roleAr: 'محللة عمليات',
    department: 'Go to market', status: 'idle', avatar: 15, spentCents: 210, budgetCents: 2000,
    focus: 'Preparing the weekly review', focusAr: 'إعداد المراجعة الأسبوعية',
    skills: ['Finance', 'Planning', 'Analysis'], manager: 'marcus' },
] as const;

/** The demo's ten tasks, refs included. `owner` is a roster key, or 'you' for the human. */
const BOARD = [
  { ref: 'TSK-142', title: 'Refine the streaming pipeline', titleAr: 'تحسين مسار معالجة البيانات',
    owner: 'aria', stage: 'progress', priority: 'high', progress: 65, due: '2026-10-05',
    description: 'Replace batch processing with a resilient streaming flow. Keep the existing path available until the new flow passes review.',
    descriptionAr: 'استبدال المعالجة بالدفعات بمسار تدفق موثوق. الاحتفاظ بالمسار الحالي حتى اجتياز المراجعة.' },
  { ref: 'TSK-147', title: 'Billing integration tests', titleAr: 'اختبارات تكامل الفوترة',
    owner: 'leo', stage: 'progress', priority: 'medium', progress: 40, due: '2026-10-06',
    description: null, descriptionAr: null },
  { ref: 'TSK-151', title: 'Understand cohort retention', titleAr: 'تحليل الاحتفاظ بالعملاء',
    owner: 'zara', stage: 'progress', priority: 'critical', progress: 30, due: '2026-10-04',
    description: null, descriptionAr: null },
  { ref: 'TSK-155', title: 'Rehearse the migration', titleAr: 'تجربة ترحيل البيانات',
    owner: 'codex', stage: 'review', priority: 'high', progress: 85, due: '2026-10-05',
    description: null, descriptionAr: null },
  { ref: 'TSK-158', title: 'Write the launch narrative', titleAr: 'كتابة قصة الإطلاق',
    owner: 'marcus', stage: 'progress', priority: 'medium', progress: 55, due: '2026-10-07',
    description: null, descriptionAr: null },
  { ref: 'TSK-160', title: 'Customer response playbook', titleAr: 'دليل الاستجابة للعملاء',
    owner: 'sam', stage: 'backlog', priority: 'medium', progress: 0, due: '2026-10-09',
    description: null, descriptionAr: null },
  { ref: 'TSK-163', title: 'Build the weekly cost model', titleAr: 'إعداد نموذج التكلفة الأسبوعي',
    owner: 'iris', stage: 'backlog', priority: 'low', progress: 15, due: '2026-10-08',
    description: null, descriptionAr: null },
  { ref: 'TSK-168', title: 'Employee onboarding guide', titleAr: 'دليل تهيئة الموظفين',
    owner: 'chloe', stage: 'done', priority: 'low', progress: 100, due: '2026-10-02',
    description: null, descriptionAr: null },
  { ref: 'TSK-169', title: 'Verify the backup process', titleAr: 'التحقق من النسخ الاحتياطي',
    owner: 'codex', stage: 'done', priority: 'medium', progress: 100, due: '2026-10-02',
    description: null, descriptionAr: null },
  { ref: 'TSK-170', title: 'Review the October roadmap', titleAr: 'مراجعة خطة أكتوبر',
    owner: 'you', stage: 'review', priority: 'high', progress: 80, due: '2026-10-05',
    description: null, descriptionAr: null },
] as const;

/** Every insert in the seed expects exactly one row; a missing row means the schema changed. */
async function first<T>(rows: Promise<T[]>, what: string): Promise<T> {
  const [row] = await rows;
  if (!row) throw new Error(`seed: ${what} was not inserted`);
  return row;
}

export async function seed(db: Db) {
  const company = await first(db.insert(t.companies).values({ name: 'Acme Studio' }).returning(), 'company');

  // The human. The demo calls them the operator; the schema calls the role 'owner'.
  const owner = await first(
    db.insert(t.members).values({ companyId: company.id, name: 'Vanil', email: null, role: 'owner' }).returning(),
    'owner',
  );

  const models = await db.insert(t.models).values([...MODELS]).returning();
  const byLane = Object.fromEntries(models.map((model) => [model.lane, model])) as Record<
    'strong' | 'balanced' | 'cheap',
    (typeof models)[number]
  >;

  // Roster, in the demo's order. Managers are wired after everyone exists (aria and marcus
  // report to the human, everyone else to one of them).
  const agentsByKey = new Map<string, { id: string }>();
  for (const person of ROSTER) {
    const row = await first(
      db.insert(t.agents).values({
        companyId: company.id,
        name: person.name, nameAr: person.nameAr,
        role: person.role, roleAr: person.roleAr,
        title: person.role,
        department: person.department,
        focus: person.focus, focusAr: person.focusAr,
        avatar: person.avatar,
        status: person.status,
        capabilities: [...person.skills],
        budgetMonthlyCents: person.budgetCents,
        errorReason: person.status === 'error' ? person.focus : null,
        pauseReason: person.status === 'paused' ? person.focus : null,
        lastHeartbeatAt: person.status === 'working' ? new Date().toISOString() : null,
      }).returning(),
      person.name,
    );
    agentsByKey.set(person.key, row);
  }
  for (const person of ROSTER) {
    const managerKey = person.manager === 'you' ? null : person.manager;
    const managerId = managerKey ? agentsByKey.get(managerKey)?.id ?? null : null;
    if (managerId) {
      await db.update(t.agents).set({ reportsTo: managerId }).where(eq(t.agents.id, agentsByKey.get(person.key)!.id));
      await db.insert(t.edges).values({
        companyId: company.id, fromAgentId: managerId, toAgentId: agentsByKey.get(person.key)!.id, kind: 'reports_to',
      });
    }
  }

  await db.insert(t.agentModels).values(
    ROSTER.map((person) => {
      const lane = person.department === 'Engineering'
        ? (person.key === 'aria' ? 'strong' : person.key === 'zara' ? 'cheap' : 'balanced')
        : 'cheap';
      const fallback = lane === 'strong' ? byLane.balanced.id : lane === 'balanced' ? byLane.cheap.id : null;
      return {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        agentId: agentsByKey.get(person.key)!.id,
        modelId: byLane[lane as 'strong' | 'balanced' | 'cheap'].id,
        fallbackModelIds: fallback ? [fallback] : [],
      };
    }),
  );

  const goal = await first(
    db.insert(t.goals).values({
      companyId: company.id, title: 'Ship the streaming pipeline',
      ownerAgentId: agentsByKey.get('aria')!.id, status: 'active',
    }).returning(),
    'goal',
  );

  // The board. Two tasks belong to the human, which is why `approvedByMemberId` is not set:
  // nothing here has been through the review gate yet.
  await db.insert(t.tasks).values(
    BOARD.map((card) => ({
      companyId: company.id,
      goalId: card.stage === 'done' ? null : goal.id,
      shortRef: card.ref,
      title: card.title,
      titleAr: card.titleAr,
      description: card.description,
      descriptionAr: card.descriptionAr,
      ownerAgentId: card.owner === 'you' ? agentsByKey.get('aria')!.id : agentsByKey.get(card.owner)!.id,
      stage: card.stage,
      priority: card.priority,
      progress: card.progress,
      dueDate: card.due ? `${card.due}T00:00:00.000Z` : null,
    })),
  );

  /*
   * Money. The demo's meters show a spent figure per employee; the ledger is where spend lives,
   * so the seed records runs that add up to exactly those figures. The numbers are chosen to look
   * like real work — a few calls of different sizes — while summing to the demo's total.
   */
  const spend: Array<[string, number, number, number]> = [
    ['aria', 320_000, 42_000, 900], ['aria', 180_000, 21_000, 350],
    ['leo', 240_000, 30_000, 470], ['leo', 70_000, 9_000, 350],
    ['zara', 900_000, 120_000, 1_400], ['zara', 300_000, 48_000, 490],
    ['codex', 150_000, 22_000, 400], ['codex', 90_000, 12_000, 240],
    ['marcus', 210_000, 28_000, 610], ['marcus', 100_000, 14_000, 300],
    ['chloe', 60_000, 9_000, 160],
    ['sam', 130_000, 18_000, 420],
    ['iris', 70_000, 11_000, 210],
  ];
  for (const [key, promptTokens, completionTokens, costCents] of spend) {
    await recordRun(db, {
      companyId: company.id,
      agentId: agentsByKey.get(key)!.id,
      modelId: byLane.cheap.id,
      requestedModelId: byLane.cheap.id,
      status: 'succeeded',
      promptTokens, completionTokens, costCents,
    });
  }
  // The one failed run that explains the employee the demo shows in its error state.
  await recordRun(db, {
    companyId: company.id,
    agentId: agentsByKey.get('zara')!.id,
    modelId: byLane.cheap.id,
    requestedModelId: byLane.cheap.id,
    status: 'failed',
    error: 'Waiting for analytics access',
  });

  // The demo's three decisions, in the product's four-part form (rule + change + audit + outcome).
  const raised = new Date(Date.now() - 3 * 60_000).toISOString();
  await db.insert(t.decisions).values([
    {
      companyId: company.id, kind: 'access', status: 'pending', shortRef: 'DEC-31', risk: 'low', costCents: 0,
      agentId: agentsByKey.get('zara')!.id, title: 'Analytics read access', titleAr: 'صلاحية قراءة التحليلات',
      rule: { id: 'access.analytics.read', source: 'agent_request', observed: 0, threshold: 0, unit: 'count' },
      diff: {
        kind: 'permission',
        summary: 'Zara needs read-only access to the analytics view to finish the retention report. No data will be modified.',
        summaryAr: 'تحتاج زارا صلاحية قراءة عرض التحليلات لإنهاء تقرير الاحتفاظ. لن تُعدّل أي بيانات.',
        before: 'No analytics access', after: 'Read-only analytics access', artifactRef: null,
      },
      audit: { raisedByKind: 'agent', raisedById: agentsByKey.get('zara')!.id, raisedAt: raised,
               decidedByKind: null, decidedById: null, decidedByLabel: null, decidedAt: null, note: null },
    },
    {
      companyId: company.id, kind: 'budget', status: 'pending', shortRef: 'DEC-32', risk: 'medium', costCents: 4500,
      agentId: agentsByKey.get('aria')!.id, title: 'A little more room for engineering', titleAr: 'ميزانية إضافية للهندسة',
      rule: { id: 'budget.monthly.increase', source: 'agent_request', observed: 4000, threshold: 4450, unit: 'cents', increaseCents: 4500 },
      diff: {
        kind: 'spend',
        summary: 'Increase this month’s engineering budget by $45 to complete the streaming rewrite without pausing the release.',
        summaryAr: 'زيادة ميزانية الهندسة لهذا الشهر بمقدار ٤٥ دولاراً لإتمام تحديث المعالجة دون تأخير الإصدار.',
        before: '$40.00', after: '$85.00', artifactRef: null,
      },
      audit: { raisedByKind: 'agent', raisedById: agentsByKey.get('aria')!.id, raisedAt: raised,
               decidedByKind: null, decidedById: null, decidedByLabel: null, decidedAt: null, note: null },
    },
    {
      companyId: company.id, kind: 'change', status: 'pending', shortRef: 'DEC-34', risk: 'high', costCents: 1200,
      agentId: agentsByKey.get('codex')!.id, title: 'Confirm the migration window', titleAr: 'تأكيد موعد الترحيل',
      rule: { id: 'change.window.confirm', source: 'agent_request', observed: 0, threshold: 1, unit: 'count' },
      diff: {
        kind: 'window',
        summary: 'The rehearsal passed. Confirm Monday’s migration window after reviewing the rollback checklist.',
        summaryAr: 'نجحت التجربة. أكّد موعد الترحيل يوم الاثنين بعد مراجعة قائمة التراجع.',
        before: 'Unconfirmed', after: 'Monday, 02:00–04:00', artifactRef: null,
      },
      audit: { raisedByKind: 'agent', raisedById: agentsByKey.get('codex')!.id, raisedAt: raised,
               decidedByKind: null, decidedById: null, decidedByLabel: null, decidedAt: null, note: null },
    },
  ]);

  // One thread, so the Conversations view has the demo's own example in it.
  const agentSaid = new Date(Date.now() - 60_000).toISOString();
  const now = new Date().toISOString();
  const thread = await first(
    db.insert(t.threads).values({
      companyId: company.id, title: 'Streaming pipeline review',
      participantAgentIds: [agentsByKey.get('aria')!.id], participantMemberIds: [owner.id],
      internal: false, lastMessageAt: now,
    }).returning(),
    'thread',
  );
  await db.insert(t.messages).values([
    {
      companyId: company.id, threadId: thread.id, authorKind: 'agent',
      authorId: agentsByKey.get('aria')!.id,
      parts: [{ type: 'text', text: 'The new streaming path passes its tests. Ready for your review when you are.' }],
      createdAt: agentSaid,
    },
    {
      companyId: company.id, threadId: thread.id, authorKind: 'member', authorId: owner.id,
      parts: [{ type: 'text', text: 'Good. Keep the old path until the review is signed off.' }],
      createdAt: now,
    },
  ]);

  return {
    companyId: company.id,
    ownerId: owner.id,
    agentIds: ROSTER.map((person) => agentsByKey.get(person.key)!.id),
  };
}
