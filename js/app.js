/* Recall — spaced review scheduler. Core logic + rendering. */
const INTERVALS = [1, 3, 7, 14, 28];
const DEFAULT_NOTE_KEYS = ['default:studentBook', 'default:activityBook', 'default:outsideBook'];
const CHECK_SVG = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

let state = {
  subjects: [],
  view: 'subjects', // 'subjects' | 'subject'
  activeSubjectId: null,
  settings: { numerals: 'eastern' },
};
let openPopoverFor = null;

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function diffDays(dateStr) {
  const target = new Date(dateStr + 'T00:00:00');
  const today = new Date(todayStr() + 'T00:00:00');
  return Math.round((target - today) / 86400000);
}
function dayWord(n) {
  return n === 1 ? 'يوم' : 'أيام';
}

function getSubject(id) {
  return state.subjects.find(s => s.id === id);
}

/* Index of the first not-yet-reviewed checkpoint, or 5 if all done. */
function firstUndone(reviews) {
  const i = reviews.indexOf(false);
  return i === -1 ? 5 : i;
}

/* Checkpoints can only be checked off in order: only the next due one can
   be marked reviewed, and only the most recently done one can be undone. */
function checkpointClickable(reviews, i) {
  const fu = firstUndone(reviews);
  return i === fu || i === fu - 1;
}

function toggleCheckpoint(lesson, i) {
  if (!checkpointClickable(lesson.reviews, i)) return;
  const fu = firstUndone(lesson.reviews);
  lesson.reviews[i] = i === fu;
}

function cpDate(lesson, i) {
  return addDays(lesson.firstReview, INTERVALS[i]);
}

function lessonStatus(lesson) {
  const fu = firstUndone(lesson.reviews);
  if (fu === 5) return { key: 'mastered' };
  const delta = diffDays(cpDate(lesson, fu));
  if (delta < 0) return { key: 'overdue', delta };
  if (delta === 0) return { key: 'due', delta };
  return { key: fu === 0 ? 'started' : 'progress', delta };
}

function isLessonDue(lesson) {
  const k = lessonStatus(lesson).key;
  return k === 'due' || k === 'overdue';
}

function noteLabel(note) {
  if (note.startsWith('default:')) {
    const key = note.slice('default:'.length);
    return t().defaultNotes[key] || key;
  }
  return note;
}

/* Demo mode (?demo=1) shows the screens pre-filled with example lessons in
   each review state. It never reads or writes storage, so opening it cannot
   touch a student's real schedule, and a reload resets it. */
const DEMO = new URLSearchParams(location.search).has('demo');

function demoSubjects() {
  const today = todayStr();
  return [
    {
      id: 'demo-math',
      name: 'الرياضيات',
      lessons: [
        // Just started: added today, nothing checked off yet.
        { id: 'd1', name: 'المتتاليات الحسابية', firstReview: today,
          reviews: [false, false, false, false, false], notes: ['default:studentBook'] },
        // Due today: first checkpoint done, the 3-day one lands on today.
        { id: 'd2', name: 'النهايات والاتصال', firstReview: addDays(today, -3),
          reviews: [true, false, false, false, false], notes: ['default:studentBook', 'default:activityBook'] },
        // Fully mastered: all five checkpoints complete.
        { id: 'd3', name: 'المشتقات', firstReview: addDays(today, -28),
          reviews: [true, true, true, true, true], notes: ['default:activityBook', 'default:outsideBook'] },
      ],
    },
    {
      id: 'demo-phys',
      name: 'الفيزياء',
      lessons: [
        { id: 'd4', name: 'الحركة الدائرية', firstReview: addDays(today, -7),
          reviews: [true, true, false, false, false], notes: ['default:studentBook'] },
        // Overdue: the 1-day checkpoint was never marked and is well past due.
        { id: 'd5', name: 'قوانين نيوتن', firstReview: addDays(today, -6),
          reviews: [false, false, false, false, false], notes: [] },
      ],
    },
    {
      id: 'demo-chem',
      name: 'الكيمياء',
      lessons: [
        { id: 'd6', name: 'الروابط الكيميائية', firstReview: addDays(today, -30),
          reviews: [true, true, true, true, true], notes: ['default:studentBook'] },
      ],
    },
    { id: 'demo-eng', name: 'اللغة الإنجليزية', lessons: [] },
  ];
}

function saveData() {
  if (DEMO) return;
  Storage.saveSubjects(state.subjects);
}
function saveSettings() {
  if (DEMO) return;
  Storage.saveSettings(state.settings);
}

function init() {
  state.subjects = DEMO ? demoSubjects() : Storage.loadSubjects();
  const savedSettings = DEMO ? null : Storage.loadSettings();
  if (savedSettings) state.settings = Object.assign(state.settings, savedSettings);
  i18nState.numerals = state.settings.numerals;

  document.getElementById('brand-tagline').textContent = t().tagline;
  document.getElementById('site-footer-note').textContent = t().footerNote;

  wireHeader();
  render();
}

function updateNumeralsToggle() {
  document.querySelectorAll('#numerals-toggle button').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-numerals') === state.settings.numerals);
  });
}

function wireHeader() {
  document.querySelectorAll('#numerals-toggle button').forEach(btn => {
    btn.onclick = () => {
      state.settings.numerals = btn.getAttribute('data-numerals');
      i18nState.numerals = state.settings.numerals;
      updateNumeralsToggle();
      saveSettings();
      render();
    };
  });
  updateNumeralsToggle();
}

// ---------- render ----------
function render() {
  const app = document.getElementById('app');
  app.innerHTML = state.view === 'subjects' ? renderSubjects() : renderSubject();
  wireEvents();
}

function renderSubjects() {
  const allLessons = state.subjects.flatMap(s => s.lessons);
  const dueTotal = allLessons.filter(isLessonDue).length;

  const cards = state.subjects
    .map(s => {
      const due = s.lessons.filter(isLessonDue).length;
      const mastered = s.lessons.filter(l => firstUndone(l.reviews) === 5).length;
      const doneCheckpoints = s.lessons.reduce((a, l) => a + l.reviews.filter(Boolean).length, 0);
      const pct = s.lessons.length ? Math.round((doneCheckpoints / (s.lessons.length * 5)) * 100) : 0;
      return `
    <div class="subj-card" data-open-subject="${s.id}">
      <button class="subj-del" data-del-subject="${s.id}" title="${t().deleteSubject}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z"/></svg>
      </button>
      <div class="subj-card-top">
        <div class="subj-name">${escapeHtml(s.name)}</div>
        <span class="subj-badge ${due > 0 ? 'due' : 'none'}">${t().dueCount(due)}</span>
      </div>
      <div class="subj-progress-track"><div class="subj-progress-fill" style="width:${pct}%"></div></div>
      <div class="subj-meta-row">
        <span>${t().lessonsCount(s.lessons.length)}</span>
        <span>${t().masteredCount(mastered)}</span>
      </div>
    </div>`;
    })
    .join('');

  return `
    <div class="screen-subjects">
      <div class="subjects-top">
        <div>
          <h1 class="page-title">${escapeHtml(t().pickSubject)}</h1>
          <p class="page-sub">${escapeHtml(t().pickSubjectSub)}</p>
        </div>
        <div class="due-tile">
          <div class="due-tile-label">${escapeHtml(t().dueToday)}</div>
          <div class="due-tile-value">${t().reviewsDueCount(dueTotal)}</div>
          <div class="due-tile-date">${fmtDate(todayStr())}</div>
        </div>
      </div>
      <div class="subjects-grid">
        ${cards}
        <button class="add-card" id="add-subject-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          ${t().newSubject}
        </button>
      </div>
      <div id="add-subject-slot"></div>
      ${state.subjects.length === 0 ? `<div class="empty" style="margin-top:24px"><div class="big">${t().noSubjects}</div>${t().noSubjectsSub}</div>` : ''}
    </div>
  `;
}

function renderSubject() {
  const subj = getSubject(state.activeSubjectId);
  if (!subj) {
    state.view = 'subjects';
    return renderSubjects();
  }

  const lessons = subj.lessons.map(l => renderLesson(subj, l)).join('');
  const dueN = subj.lessons.filter(isLessonDue).length;
  const masteredN = subj.lessons.filter(l => firstUndone(l.reviews) === 5).length;

  return `
    <div class="screen-lessons">
      <button class="back-btn" id="back-btn"><span class="arrow">→</span>${t().backToSubjects}</button>

      <div class="lessons-top">
        <h1 class="subject-title">${escapeHtml(subj.name)}</h1>
        <div class="subject-stats">
          <div><div class="stat-value lessons">${fmtNum(subj.lessons.length)}</div>${escapeHtml(t().lessonsLabel)}</div>
          <div><div class="stat-value due">${fmtNum(dueN)}</div>${escapeHtml(t().dueLabel)}</div>
          <div><div class="stat-value mastered">${fmtNum(masteredN)}</div>${escapeHtml(t().masteredLabel)}</div>
        </div>
      </div>

      <div class="inline-form add-lesson-form">
        <div class="lesson-form-row">
          <input type="text" id="new-lesson-name" placeholder="${t().lessonNamePlaceholder}">
          <input type="date" id="new-lesson-date" value="${todayStr()}">
          <button class="primary" id="add-lesson-btn">${t().addLesson}</button>
        </div>
      </div>

      ${subj.lessons.length ? `
      <div class="lessons-col-headers">
        <div>${t().lessonColumn}</div>
        <div>${t().reviewSchedule}</div>
      </div>
      <div class="lessons-list">${lessons}</div>
      <p class="timeline-hint">${escapeHtml(t().timelineHint)}</p>
      ` : `<div class="empty"><div class="big">${t().noLessons}</div>${t().noLessonsSub}</div>`}
    </div>
  `;
}

function renderLesson(subj, lesson) {
  const fu = firstUndone(lesson.reviews);
  const status = lessonStatus(lesson);
  const badge = {
    mastered: { label: t().mastered, cls: 'mastered' },
    due: { label: t().dueNow, cls: 'due' },
    overdue: { label: t().overdue, cls: 'overdue' },
    started: { label: t().started, cls: 'waiting' },
    progress: { label: t().inProgress, cls: 'waiting' },
  }[status.key];

  const pos = i => (19 + i * 17).toFixed(1);
  const doneCount = lesson.reviews.filter(Boolean).length;

  const cps = INTERVALS.map((day, i) => {
    const doneCp = lesson.reviews[i];
    const revealed = i <= fu;
    const delta = doneCp ? null : diffDays(cpDate(lesson, i));
    const isDue = !doneCp && i === fu && delta === 0;
    const isOverdue = !doneCp && i === fu && delta < 0;
    const clickable = checkpointClickable(lesson.reviews, i);
    const circleCls = doneCp ? 'done' : (isDue || isOverdue) ? 'due' : revealed ? 'revealed' : 'hidden';
    const dayCls = doneCp ? 'done' : (isDue || isOverdue) ? 'due' : 'waiting';
    const dateCls = revealed ? ((isDue || isOverdue) ? 'due' : 'revealed') : 'hidden';
    return `
      <div class="cp" style="inset-inline-start:calc(${pos(i)}% - 52px)">
        <button class="cp-circle ${circleCls} ${clickable ? 'clickable' : 'not-clickable'}"
          data-toggle-cp="${lesson.id}" data-idx="${i}"
          title="${clickable ? escapeHtml(doneCp ? 'تراجع' : 'وضع علامة مراجعة') : ''}">${doneCp ? CHECK_SVG : ''}</button>
        <div class="cp-day-label ${dayCls}">${bidiNum(day)}&#8201; ${dayWord(day)}</div>
        <div class="cp-date-label ${dateCls}">${revealed ? fmtDate(cpDate(lesson, i)) : '···'}</div>
      </div>`;
  }).join('');

  const fill = doneCount ? `calc(${pos(lesson.reviews.lastIndexOf(true))}% - 1.5%)` : '0%';

  const nextIsDue = status.key === 'due' || status.key === 'overdue';
  const nextCaption = status.key === 'mastered' ? '' : t().nextReview;
  const nextValue = status.key === 'mastered' ? t().allDone : fmtDate(cpDate(lesson, fu));
  const nextCls = status.key === 'mastered' ? 'mastered' : nextIsDue ? 'due' : 'normal';

  const chips = (lesson.notes || [])
    .map(n => `
    <span class="chip" style="background:${chipBg(n)};color:${chipFg(n)}">${escapeHtml(noteLabel(n))}<button data-remove-note="${lesson.id}" data-note="${escapeHtml(n)}">&times;</button></span>
  `)
    .join('');

  const popoverHtml = openPopoverFor === lesson.id ? renderNotePopover(lesson) : '';

  return `
  <article class="lesson-card ${badge.cls}">
    <button class="lesson-del-btn" data-del-lesson="${lesson.id}" title="${t().deleteLesson}">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z"/></svg>
    </button>
    <div class="lesson-left">
      <div class="lesson-badges-row">
        <span class="lesson-status-badge ${badge.cls}">${badge.label}</span>
        <span class="lesson-progress-label">${t().progressOfFive(doneCount)}</span>
      </div>
      <input class="lesson-name-input" data-rename="${lesson.id}" value="${escapeHtml(lesson.name)}">
      <div class="lesson-first-review">${t().firstReview}: <input type="date" data-firstreview="${lesson.id}" value="${lesson.firstReview}"></div>

      <div class="tags-block">
        <div class="tags-label">${escapeHtml(t().completedWith)}</div>
        <div class="tags-row">
          ${chips}
          <button class="chip-add" data-open-notes="${lesson.id}">${t().addTag}</button>
        </div>
        ${popoverHtml}
      </div>
    </div>

    <div class="lesson-right">
      <div class="next-review-row">
        <span class="next-review-caption">${escapeHtml(nextCaption)}</span>
        <span class="next-review-value ${nextCls}">${nextValue}</span>
      </div>
      <div class="timeline">
        <div class="timeline-track"></div>
        <div class="timeline-track-fill" style="width:${fill}"></div>
        <div class="timeline-day0-mark"></div>
        <div class="timeline-day0-label">${escapeHtml(t().firstReview)}</div>
        ${cps}
      </div>
    </div>
  </article>`;
}

const CUSTOM_NOTE_BG = 'rgba(20,20,18,.09)';
const CUSTOM_NOTE_FG = 'rgba(20,20,18,.72)';
function chipBg(note) {
  if (note === 'default:studentBook') return 'rgba(157,189,184,.42)';
  if (note === 'default:activityBook') return 'rgba(234,46,0,.13)';
  return CUSTOM_NOTE_BG;
}
function chipFg(note) {
  if (note === 'default:studentBook') return '#2F4A46';
  if (note === 'default:activityBook') return '#8E2000';
  return CUSTOM_NOTE_FG;
}

function renderNotePopover(lesson) {
  const existingCustom = (lesson.notes || []).filter(n => !n.startsWith('default:'));
  const allOptions = [...DEFAULT_NOTE_KEYS, ...existingCustom];
  const opts = allOptions
    .map(opt => {
      const checked = (lesson.notes || []).includes(opt);
      return `<button type="button" class="tags-popover-opt" data-toggle-note="${lesson.id}" data-note="${escapeHtml(opt)}">
      <span class="chip" style="background:${chipBg(opt)};color:${chipFg(opt)}">${escapeHtml(noteLabel(opt))}</span>
      <span class="tick">${checked ? '&#10003;' : ''}</span>
    </button>`;
    })
    .join('');
  return `
    <div class="tags-popover">
      <div class="tags-popover-label">${escapeHtml(t().selectOption)}</div>
      ${opts}
      <div class="tags-popover-divider"></div>
      <form class="tags-popover-form" data-add-note="${lesson.id}">
        <input type="text" placeholder="${t().addOptionPlaceholder}" data-custom-note="${lesson.id}">
        <button type="submit">+</button>
      </form>
    </div>`;
}

function escapeHtml(s) {
  return (s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- events ----------
function wireEvents() {
  const app = document.getElementById('app');

  const addSubjBtn = document.getElementById('add-subject-btn');
  if (addSubjBtn) {
    addSubjBtn.onclick = () => {
      const slot = document.getElementById('add-subject-slot');
      slot.innerHTML = `
        <div class="inline-form" style="margin-top:14px;max-width:340px">
          <input type="text" id="new-subj-input" placeholder="${t().subjectNamePlaceholder}" autofocus>
          <div class="row-btns">
            <button class="primary" id="confirm-add-subj">${t().add}</button>
            <button class="ghost" id="cancel-add-subj">${t().cancel}</button>
          </div>
        </div>`;
      const input = document.getElementById('new-subj-input');
      input.focus();
      const confirm = () => {
        const name = input.value.trim();
        if (name) {
          state.subjects.push({ id: uid(), name, lessons: [] });
          slot.innerHTML = '';
          saveData();
          render();
        }
      };
      document.getElementById('confirm-add-subj').onclick = confirm;
      document.getElementById('cancel-add-subj').onclick = () => {
        slot.innerHTML = '';
      };
      input.onkeydown = e => {
        if (e.key === 'Enter') confirm();
      };
    };
  }

  app.querySelectorAll('[data-open-subject]').forEach(el => {
    el.onclick = e => {
      if (e.target.closest('[data-del-subject]')) return;
      state.activeSubjectId = el.getAttribute('data-open-subject');
      state.view = 'subject';
      openPopoverFor = null;
      render();
    };
  });
  app.querySelectorAll('[data-del-subject]').forEach(el => {
    el.onclick = e => {
      e.stopPropagation();
      const id = el.getAttribute('data-del-subject');
      state.subjects = state.subjects.filter(s => s.id !== id);
      saveData();
      render();
    };
  });

  const backBtn = document.getElementById('back-btn');
  if (backBtn)
    backBtn.onclick = () => {
      state.view = 'subjects';
      state.activeSubjectId = null;
      render();
    };

  const addLessonBtn = document.getElementById('add-lesson-btn');
  if (addLessonBtn) {
    addLessonBtn.onclick = () => {
      const nameInput = document.getElementById('new-lesson-name');
      const dateInput = document.getElementById('new-lesson-date');
      const name = nameInput.value.trim();
      if (!name) {
        nameInput.focus();
        return;
      }
      const subj = getSubject(state.activeSubjectId);
      subj.lessons.push({
        id: uid(),
        name,
        firstReview: dateInput.value || todayStr(),
        reviews: [false, false, false, false, false],
        notes: [],
      });
      saveData();
      render();
    };
  }

  app.querySelectorAll('[data-rename]').forEach(el => {
    el.onchange = () => {
      const subj = getSubject(state.activeSubjectId);
      const lesson = subj.lessons.find(l => l.id === el.getAttribute('data-rename'));
      lesson.name = el.value.trim() || lesson.name;
      saveData();
      render();
    };
  });

  app.querySelectorAll('[data-firstreview]').forEach(el => {
    el.onchange = () => {
      const subj = getSubject(state.activeSubjectId);
      const lesson = subj.lessons.find(l => l.id === el.getAttribute('data-firstreview'));
      lesson.firstReview = el.value;
      saveData();
      render();
    };
  });

  app.querySelectorAll('[data-del-lesson]').forEach(el => {
    el.onclick = () => {
      const subj = getSubject(state.activeSubjectId);
      subj.lessons = subj.lessons.filter(l => l.id !== el.getAttribute('data-del-lesson'));
      saveData();
      render();
    };
  });

  app.querySelectorAll('[data-toggle-cp]').forEach(el => {
    el.onclick = () => {
      const subj = getSubject(state.activeSubjectId);
      const lesson = subj.lessons.find(l => l.id === el.getAttribute('data-toggle-cp'));
      const idx = parseInt(el.getAttribute('data-idx'), 10);
      toggleCheckpoint(lesson, idx);
      saveData();
      render();
    };
  });

  app.querySelectorAll('[data-open-notes]').forEach(el => {
    el.onclick = e => {
      e.stopPropagation();
      const id = el.getAttribute('data-open-notes');
      openPopoverFor = openPopoverFor === id ? null : id;
      render();
    };
  });

  app.querySelectorAll('[data-toggle-note]').forEach(el => {
    el.onclick = () => {
      const subj = getSubject(state.activeSubjectId);
      const lesson = subj.lessons.find(l => l.id === el.getAttribute('data-toggle-note'));
      const note = el.getAttribute('data-note');
      lesson.notes = lesson.notes || [];
      if (lesson.notes.includes(note)) lesson.notes = lesson.notes.filter(n => n !== note);
      else lesson.notes.push(note);
      saveData();
      render();
    };
  });

  app.querySelectorAll('[data-remove-note]').forEach(el => {
    el.onclick = e => {
      e.stopPropagation();
      const subj = getSubject(state.activeSubjectId);
      const lesson = subj.lessons.find(l => l.id === el.getAttribute('data-remove-note'));
      const note = el.getAttribute('data-note');
      lesson.notes = (lesson.notes || []).filter(n => n !== note);
      saveData();
      render();
    };
  });

  app.querySelectorAll('[data-add-note]').forEach(el => {
    el.onsubmit = e => {
      e.preventDefault();
      const input = el.querySelector('[data-custom-note]');
      const val = input.value.trim();
      if (!val) return;
      const subj = getSubject(state.activeSubjectId);
      const lesson = subj.lessons.find(l => l.id === el.getAttribute('data-add-note'));
      lesson.notes = lesson.notes || [];
      if (!lesson.notes.includes(val)) lesson.notes.push(val);
      saveData();
      render();
    };
  });

  document.onclick = e => {
    if (openPopoverFor && !e.target.closest('.tags-block')) {
      openPopoverFor = null;
      render();
    }
  };
}

init();
