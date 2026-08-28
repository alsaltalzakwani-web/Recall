/* Arabic strings + locale-aware number/date formatting.
   Recall is Arabic-only — see README for why the language toggle was dropped. */

/* n → one of forms.zero/one/two/few (3–10)/many (11+), Arabic plural rules. */
function arPlural(n, forms) {
  if (n === 0 && forms.zero !== undefined) return forms.zero;
  if (n === 1) return forms.one;
  if (n === 2) return forms.two;
  if (n >= 3 && n <= 10) return forms.few;
  return forms.many;
}

const STRINGS = {
  tagline: 'التكرار المتباعد، في موعده',
  pickSubject: 'اختر مادة',
  pickSubjectSub: 'اختر مادة لعرض دروسها وموضع كل درس في دورة المراجعة.',
  dueToday: 'مراجعات اليوم',
  newSubject: 'مادة جديدة',
  subjectNamePlaceholder: 'اسم المادة',
  add: 'إضافة',
  cancel: 'إلغاء',
  deleteSubject: 'حذف المادة',
  lessonsCount: n => arPlural(n, {
    zero: 'لا دروس', one: 'درس واحد', two: 'درسان',
    few: `${bidiNum(n)} دروس`, many: `${bidiNum(n)} درساً`,
  }),
  dueCount: n => arPlural(n, {
    zero: '—', one: 'مستحق واحد', two: 'مستحقان',
    few: `${bidiNum(n)} مستحقة`, many: `${bidiNum(n)} مستحقاً`,
  }),
  masteredCount: n => arPlural(n, {
    zero: 'لا دروس متقنة', one: 'درس متقن واحد', two: 'درسان متقنان',
    few: `${bidiNum(n)} دروس متقنة`, many: `${bidiNum(n)} درساً متقناً`,
  }),
  reviewsDueCount: n => arPlural(n, {
    zero: 'لا مراجعات', one: 'مراجعة واحدة', two: 'مراجعتان',
    few: `${bidiNum(n)} مراجعات`, many: `${bidiNum(n)} مراجعة`,
  }),
  lessonsLabel: 'دروس',
  dueLabel: 'مستحقة',
  masteredLabel: 'مُتقن',
  noSubjects: 'لا توجد مواد بعد',
  noSubjectsSub: 'أضف مادة لبناء جدول مراجعتها.',
  backToSubjects: 'كل المواد',
  lessonNamePlaceholder: 'اسم الدرس',
  addLesson: 'إضافة درس',
  firstReview: 'أول مراجعة',
  nextReview: 'المراجعة القادمة',
  mastered: 'مُتقَن',
  dueNow: 'مستحق اليوم',
  overdue: 'متأخرة',
  started: 'بدأ',
  inProgress: 'قيد المراجعة',
  allDone: 'اكتملت المراجعات الخمس',
  noLessons: 'لا توجد دروس بعد',
  noLessonsSub: 'أضف درساً أعلاه لبدء جدول المراجعة ١-٣-٧-١٤-٢٨.',
  deleteLesson: 'حذف الدرس',
  lessonColumn: 'الدرس',
  reviewSchedule: 'جدول المراجعة',
  progressOfFive: n => `${bidiNum(n)} من ${bidiNum(5)}`,
  completedWith: 'أُنجز باستخدام',
  addTag: '+ إضافة',
  selectOption: 'اختر خيارًا',
  addOptionPlaceholder: 'أضف خيارًا',
  timelineHint: 'اضغط على أي نقطة مراجعة لتأكيدها — سيظهر موعد المراجعة التالية تلقائيًا.',
  footerNote: 'يُحفظ تقدمك في هذا المتصفح فقط، ولا يتم مزامنته بين الأجهزة.',
  defaultNotes: {
    studentBook: 'كتاب الطالب',
    activityBook: 'كتاب النشاط',
    outsideBook: 'كتاب خارجي',
  },
};

/* current numerals setting, read by the formatter helpers below (set by app.js) */
const i18nState = { numerals: 'eastern' };

function t() {
  return STRINGS;
}

function currentLocale() {
  const numSys = i18nState.numerals === 'eastern' ? 'arab' : 'latn';
  return `ar-u-nu-${numSys}`;
}

function fmtNum(n) {
  try {
    return new Intl.NumberFormat(currentLocale()).format(n);
  } catch (e) {
    return String(n);
  }
}

/* A number glued next to Arabic words gets visually reordered by the
   browser's bidi algorithm (western digits are a weak "European number"
   run with no strong direction of their own) — e.g. "3 مراجعات" renders
   with "مراجعات" first. <bdi> isolates the digits from that reordering. */
function bidiNum(n) {
  return `<bdi>${fmtNum(n)}</bdi>`;
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  try {
    const month = new Intl.DateTimeFormat('ar', { month: 'short' }).format(d);
    return `${bidiNum(d.getDate())} ${month}`;
  } catch (e) {
    return dateStr;
  }
}
