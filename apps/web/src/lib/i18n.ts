/**
 * The bilingual string table. Two languages, one shape (doc `design/tokens` i18n block):
 * EN and AR pairs, `dir` switches to rtl, and the Arabic face is the readable sans —
 * the pixel face is suppressed for Arabic exactly as the design source specifies.
 *
 * Wording rule (governance §5): no "coming soon", no internal identifiers, no blame.
 */
export type Lang = 'en' | 'ar';

export const STRINGS = {
  brand: { en: 'company.os', ar: 'company.os' },
  brandSub: { en: 'HUMAN × ARTIFICIAL', ar: 'بشري × اصطناعي' },
  skip: { en: 'Skip to content', ar: 'تجاوز إلى المحتوى' },
  team: { en: 'Team', ar: 'الفريق' },
  tasks: { en: 'Tasks', ar: 'المهام' },
  inbox: { en: 'Inbox', ar: 'الوارد' },
  comms: { en: 'Conversations', ar: 'المحادثات' },
  network: { en: 'Network', ar: 'الشبكة' },
  settings: { en: 'Settings', ar: 'الإعدادات' },
  search: { en: 'Search', ar: 'بحث' },
  theme: { en: 'Theme', ar: 'المظهر' },
  language: { en: 'Language', ar: 'اللغة' },
  account: { en: 'Account', ar: 'الحساب' },
  orgChart: { en: 'Organization chart', ar: 'الهيكل التنظيمي' },
  loading: { en: 'Loading', ar: 'جارٍ التحميل' },
  emptyTitle: { en: 'Nothing here yet', ar: 'لا يوجد شيء بعد' },
  emptyBody: { en: 'When there is something to show, it appears here.', ar: 'عندما يكون هناك ما يُعرض، سيظهر هنا.' },
  errorTitle: { en: 'Could not load this', ar: 'تعذّر تحميل هذا' },
  errorBody: { en: 'Check the connection and try again.', ar: 'تحقّق من الاتصال وحاول مرة أخرى.' },
  retry: { en: 'Retry', ar: 'إعادة المحاولة' },
  restrictedTitle: { en: 'You do not have access', ar: 'ليست لديك صلاحية' },
  restrictedBody: { en: 'Ask an owner if you need it.', ar: 'اطلب من المالك إذا كنت تحتاجه.' },
  owner: { en: 'Owner', ar: 'المالك' },
  spendOf: { en: 'of monthly budget', ar: 'من الميزانية الشهرية' },
  approve: { en: 'Approve', ar: 'موافقة' },
  reject: { en: 'Reject', ar: 'رفض' },
  decided: { en: 'Already decided', ar: 'تم البتّ فيه' },
  rule: { en: 'Rule', ar: 'القاعدة' },
  change: { en: 'Change', ar: 'التغيير' },
  audit: { en: 'Audit', ar: 'التدقيق' },
  status: { en: 'Status', ar: 'الحالة' },
  online: { en: 'Live', ar: 'متصل' },
  version: { en: 'P0 foundation', ar: 'أساس المرحلة صفر' },
  teamNote: { en: 'Roles, budgets and the model behind each employee.', ar: 'الأدوار والميزانيات والنموذج وراء كل موظف.' },
  tasksNote: { en: 'Backlog to completed — nothing reaches completed without a person approving it.', ar: 'من قائمة الانتظار إلى مكتملة — لا شيء يكتمل دون موافقة شخص.' },
  inboxNote: { en: 'Every request shows the rule behind it, the change, and who decided.', ar: 'كل طلب يُظهر القاعدة خلفه، والتغيير، ومن بتّ فيه.' },
  commsNote: { en: 'Threads carry the model that wrote each message.', ar: 'كل محادثة تحمل النموذج الذي كتب كل رسالة.' },
  networkNote: { en: 'A first look. The full canvas with guaranteed spacing arrives in phase P3.', ar: 'نظرة أولى. اللوحة الكاملة بتباعد مضمون تصل في المرحلة P3.' },
  settingsNote: { en: 'The company, its models and their prices.', ar: 'الشركة ونماذجها وأسعارها.' },
  models: { en: 'Models', ar: 'النماذج' },
  perMillion: { en: 'per 1M tokens', ar: 'لكل مليون رمز' },
  inLabel: { en: 'in', ar: 'دخل' },
  outLabel: { en: 'out', ar: 'خرج' },
  lane: { en: 'Lane', ar: 'المسار' },
  company: { en: 'Company', ar: 'الشركة' },
  members: { en: 'People', ar: 'الأشخاص' },
  blocked: { en: 'Paused by budget', ar: 'متوقف بسبب الميزانية' },
} as const;

export type StringKey = keyof typeof STRINGS;

export function t(key: StringKey, lang: Lang): string {
  return STRINGS[key][lang];
}
