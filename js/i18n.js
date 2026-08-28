/* Translation strings + locale-aware number/date formatting. */
const STRINGS = {
  en: {
    dir: 'ltr',
    brand: 'Recall',
    tagline: 'Spaced review schedules, by subject.',
    newSubject: 'New subject',
    subjectNamePlaceholder: 'Subject name',
    add: 'Add',
    cancel: 'Cancel',
    deleteSubject: 'Delete subject',
    lessonsCount: n => `${fmtNum(n)} lesson${n === 1 ? '' : 's'}`,
    dueCount: n => `${fmtNum(n)} due`,
    upToDate: 'Up to date',
    noSubjects: 'No subjects yet',
    noSubjectsSub: 'Add one to build its review schedule.',
    backToSubjects: 'Subjects',
    lessonNamePlaceholder: 'Lesson name',
    addLesson: 'Add lesson',
    firstReview: 'First review',
    mastered: 'Mastered',
    dueNow: 'Due now',
    next: date => `Next: ${date}`,
    noLessons: 'No lessons yet',
    noLessonsSub: 'Add a lesson above to start its 1–3–7–14–28 review schedule.',
    deleteLesson: 'Delete lesson',
    completedWith: 'Completed with',
    addNote: '+ add',
    customNotePlaceholder: 'Add custom + Enter',
    dayShort: d => `${fmtNum(d)}d`,
    langToggleLabel: 'العربية',
    numeralsLabel: n => (n === 'eastern' ? '٠١٢٣' : '0123'),
    footerNote: 'Your progress is saved on this browser only — it won’t sync across devices.',
    defaultNotes: {
      studentBook: 'Student book',
      activityBook: 'Activity book',
      outsideBook: 'Outside book',
    },
  },
  ar: {
    dir: 'rtl',
    brand: 'Recall',
    tagline: 'جداول مراجعة موزعة على فترات، لكل مادة.',
    newSubject: 'مادة جديدة',
    subjectNamePlaceholder: 'اسم المادة',
    add: 'إضافة',
    cancel: 'إلغاء',
    deleteSubject: 'حذف المادة',
    lessonsCount: n => {
      if (n === 0) return 'لا دروس';
      if (n === 1) return 'درس واحد';
      if (n === 2) return 'درسان';
      if (n >= 3 && n <= 10) return `${fmtNum(n)} دروس`;
      return `${fmtNum(n)} درساً`;
    },
    dueCount: n => {
      if (n === 1) return 'مستحق واحد';
      if (n === 2) return 'مستحقان';
      if (n >= 3 && n <= 10) return `${fmtNum(n)} مستحقة`;
      return `${fmtNum(n)} مستحقاً`;
    },
    upToDate: 'محدَّث',
    noSubjects: 'لا توجد مواد بعد',
    noSubjectsSub: 'أضف مادة لبناء جدول مراجعتها.',
    backToSubjects: 'المواد',
    lessonNamePlaceholder: 'اسم الدرس',
    addLesson: 'إضافة درس',
    firstReview: 'أول مراجعة',
    mastered: 'مُتقَن',
    dueNow: 'مستحق الآن',
    next: date => `التالي: ${date}`,
    noLessons: 'لا توجد دروس بعد',
    noLessonsSub: 'أضف درساً أعلاه لبدء جدول المراجعة ١-٣-٧-١٤-٢٨.',
    deleteLesson: 'حذف الدرس',
    completedWith: 'أُنجز باستخدام',
    addNote: '+ إضافة',
    customNotePlaceholder: 'أضف وسماً مخصصاً ثم Enter',
    dayShort: d => `${fmtNum(d)}ي`,
    langToggleLabel: 'English',
    numeralsLabel: n => (n === 'eastern' ? '٠١٢٣' : '0123'),
    footerNote: 'يُحفظ تقدمك في هذا المتصفح فقط، ولا يتم مزامنته بين الأجهزة.',
    defaultNotes: {
      studentBook: 'كتاب الطالب',
      activityBook: 'كتاب النشاط',
      outsideBook: 'كتاب خارجي',
    },
  },
};

/* current settings, read by the formatter helpers above (set by app.js) */
const i18nState = { lang: 'ar', numerals: 'eastern' };

function t() {
  return STRINGS[i18nState.lang];
}

function currentLocale() {
  const numSys = i18nState.numerals === 'eastern' ? 'arab' : 'latn';
  const base = i18nState.lang === 'ar' ? 'ar' : 'en';
  return `${base}-u-nu-${numSys}`;
}

function fmtNum(n) {
  try {
    return new Intl.NumberFormat(currentLocale()).format(n);
  } catch (e) {
    return String(n);
  }
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  try {
    return new Intl.DateTimeFormat(currentLocale(), { month: 'short', day: 'numeric' }).format(d);
  } catch (e) {
    return dateStr;
  }
}
