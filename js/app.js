/* Recall — spaced review scheduler. Core logic + rendering. */
const INTERVALS = [1, 3, 7, 14, 28];
const DEFAULT_NOTE_KEYS = ['default:studentBook', 'default:activityBook', 'default:outsideBook'];

let state = {
  subjects: [],
  view: 'subjects', // 'subjects' | 'subject'
  activeSubjectId: null,
  settings: { lang: 'ar', numerals: 'eastern', numeralsManual: false },
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

function getSubject(id) {
  return state.subjects.find(s => s.id === id);
}

function lessonStatus(lesson) {
  const idx = lesson.reviews.findIndex(r => !r);
  if (idx === -1) return { status: 'mastered', next: null };
  const next = addDays(lesson.firstReview, INTERVALS[idx]);
  const status = next <= todayStr() ? 'due' : 'upcoming';
  return { status, next };
}

function subjectDueCount(subj) {
  return subj.lessons.filter(l => lessonStatus(l).status === 'due').length;
}

function noteLabel(note) {
  if (note.startsWith('default:')) {
    const key = note.slice('default:'.length);
    return t().defaultNotes[key] || key;
  }
  return note;
}

function saveData() {
  Storage.saveSubjects(state.subjects);
}
function saveSettings() {
  Storage.saveSettings(state.settings);
}

function init() {
  state.subjects = Storage.loadSubjects();
  const savedSettings = Storage.loadSettings();
  if (savedSettings) {
    state.settings = Object.assign(state.settings, savedSettings);
  } else {
    // First run: default numerals follow default language.
    state.settings.numerals = state.settings.lang === 'ar' ? 'eastern' : 'western';
  }
  applySettingsToDom();
  wireHeader();
  render();
}

function applySettingsToDom() {
  i18nState.lang = state.settings.lang;
  i18nState.numerals = state.settings.numerals;
  document.documentElement.setAttribute('dir', t().dir);
  document.documentElement.setAttribute('lang', state.settings.lang);
  updateHeaderTexts();
}

function updateHeaderTexts() {
  const langBtn = document.getElementById('lang-toggle');
  const numBtn = document.getElementById('numerals-toggle');
  const footer = document.getElementById('site-footer-note');
  if (langBtn) langBtn.textContent = t().langToggleLabel;
  if (numBtn) {
    numBtn.textContent = t().numeralsLabel(state.settings.numerals);
    numBtn.classList.toggle('active', state.settings.numerals === 'eastern');
  }
  if (footer) footer.textContent = t().footerNote;
}

function wireHeader() {
  const langBtn = document.getElementById('lang-toggle');
  const numBtn = document.getElementById('numerals-toggle');
  langBtn.onclick = () => {
    state.settings.lang = state.settings.lang === 'ar' ? 'en' : 'ar';
    if (!state.settings.numeralsManual) {
      state.settings.numerals = state.settings.lang === 'ar' ? 'eastern' : 'western';
    }
    applySettingsToDom();
    saveSettings();
    openPopoverFor = null;
    render();
  };
  numBtn.onclick = () => {
    state.settings.numerals = state.settings.numerals === 'eastern' ? 'western' : 'eastern';
    state.settings.numeralsManual = true;
    applySettingsToDom();
    saveSettings();
    render();
  };
}

// ---------- render ----------
function render() {
  const app = document.getElementById('app');
  app.innerHTML = state.view === 'subjects' ? renderSubjects() : renderSubject();
  wireEvents();
}

function renderSubjects() {
  const cards = state.subjects
    .map(s => {
      const due = subjectDueCount(s);
      return `
    <div class="subj-card" data-open-subject="${s.id}">
      <button class="subj-del" data-del-subject="${s.id}" title="${t().deleteSubject}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z"/></svg>
      </button>
      <p class="subj-name">${escapeHtml(s.name)}</p>
      <div class="subj-meta">
        <span>${t().lessonsCount(s.lessons.length)}</span>
        ${due > 0 ? `<span class="badge due">${t().dueCount(due)}</span>` : (s.lessons.length ? `<span class="badge ok">${t().upToDate}</span>` : '')}
      </div>
    </div>`;
    })
    .join('');

  return `
    <div class="top">
      <div><h1 class="page-title">${escapeHtml(t().brand)}</h1><div class="tagline">${t().tagline}</div></div>
    </div>
    <div class="grid">
      ${cards}
      <button class="add-card" id="add-subject-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
        ${t().newSubject}
      </button>
    </div>
    <div id="add-subject-slot"></div>
    ${state.subjects.length === 0 ? `<div class="empty" style="margin-top:24px"><div class="big">${t().noSubjects}</div>${t().noSubjectsSub}</div>` : ''}
  `;
}

function renderSubject() {
  const subj = getSubject(state.activeSubjectId);
  if (!subj) {
    state.view = 'subjects';
    return renderSubjects();
  }

  const lessons = subj.lessons.map(l => renderLesson(subj, l)).join('');

  return `
    <div class="top">
      <div>
        <button class="backbtn" id="back-btn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
          ${t().backToSubjects}
        </button>
        <h1 class="page-title" style="margin-top:6px">${escapeHtml(subj.name)}</h1>
      </div>
    </div>
    <div class="inline-form" style="margin-bottom:20px">
      <div class="lesson-form-row">
        <input type="text" id="new-lesson-name" placeholder="${t().lessonNamePlaceholder}">
        <input type="date" id="new-lesson-date" value="${todayStr()}">
        <button class="primary" id="add-lesson-btn">${t().addLesson}</button>
      </div>
    </div>
    ${lessons || `<div class="empty"><div class="big">${t().noLessons}</div>${t().noLessonsSub}</div>`}
  `;
}

function renderLesson(subj, lesson) {
  const { status, next } = lessonStatus(lesson);
  const pillLabel = status === 'mastered' ? t().mastered : status === 'due' ? t().dueNow : t().next(fmtDate(next));
  const maxDay = INTERVALS[INTERVALS.length - 1];

  const ticks = INTERVALS.map((day, i) => {
    const checked = lesson.reviews[i];
    const pos = (Math.sqrt(day) / Math.sqrt(maxDay)) * 92 + 4; // 4%..96%
    const dateForTick = addDays(lesson.firstReview, day);
    return `
    <div class="tick ${checked ? 'checked' : ''}" style="inset-inline-start:${pos}%" data-toggle-review="${lesson.id}" data-idx="${i}">
      <span class="daylabel">${t().dayShort(day)}</span>
      <span class="dot"><svg viewBox="0 0 24 24" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>
      <span class="datelabel">${fmtDate(dateForTick)}</span>
    </div>`;
  }).join('');

  const chips = (lesson.notes || [])
    .map(n => `
    <span class="chip">${escapeHtml(noteLabel(n))} <button data-remove-note="${lesson.id}" data-note="${escapeHtml(n)}">&times;</button></span>
  `)
    .join('');

  const popoverHtml = openPopoverFor === lesson.id ? renderNotePopover(lesson) : '';

  return `
  <div class="lesson">
    <div class="lesson-head">
      <input class="lesson-name" data-rename="${lesson.id}" value="${escapeHtml(lesson.name)}">
      <button class="icon-btn" data-del-lesson="${lesson.id}" title="${t().deleteLesson}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z"/></svg>
      </button>
    </div>
    <div class="meta-row">
      <label>${t().firstReview} <input type="date" data-firstreview="${lesson.id}" value="${lesson.firstReview}"></label>
      <span class="status-pill ${status}">${pillLabel}</span>
    </div>
    <div class="timeline"><div class="track"></div>${ticks}</div>
    <div class="notes-wrap">
      <div class="notes-label">${t().completedWith}</div>
      <div class="chips">
        ${chips}
        <button class="chip-add" data-open-notes="${lesson.id}">${t().addNote}</button>
      </div>
      ${popoverHtml}
    </div>
  </div>`;
}

function renderNotePopover(lesson) {
  const existingCustom = (lesson.notes || []).filter(n => !n.startsWith('default:'));
  const allOptions = [...DEFAULT_NOTE_KEYS, ...existingCustom];
  const opts = allOptions
    .map(opt => {
      const checked = (lesson.notes || []).includes(opt);
      return `<div class="opt" data-toggle-note="${lesson.id}" data-note="${escapeHtml(opt)}">
      <input type="checkbox" ${checked ? 'checked' : ''} style="pointer-events:none"> ${escapeHtml(noteLabel(opt))}
    </div>`;
    })
    .join('');
  return `
    <div class="popover" data-popover-for="${lesson.id}">
      ${opts}
      <input type="text" placeholder="${t().customNotePlaceholder}" data-custom-note="${lesson.id}">
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

  app.querySelectorAll('[data-toggle-review]').forEach(el => {
    el.onclick = () => {
      const subj = getSubject(state.activeSubjectId);
      const lesson = subj.lessons.find(l => l.id === el.getAttribute('data-toggle-review'));
      const idx = parseInt(el.getAttribute('data-idx'), 10);
      lesson.reviews[idx] = !lesson.reviews[idx];
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
    el.onclick = () => {
      const subj = getSubject(state.activeSubjectId);
      const lesson = subj.lessons.find(l => l.id === el.getAttribute('data-remove-note'));
      const note = el.getAttribute('data-note');
      lesson.notes = (lesson.notes || []).filter(n => n !== note);
      saveData();
      render();
    };
  });

  app.querySelectorAll('[data-custom-note]').forEach(el => {
    el.onkeydown = e => {
      if (e.key === 'Enter' && el.value.trim()) {
        const subj = getSubject(state.activeSubjectId);
        const lesson = subj.lessons.find(l => l.id === el.getAttribute('data-custom-note'));
        lesson.notes = lesson.notes || [];
        const val = el.value.trim();
        if (!lesson.notes.includes(val)) lesson.notes.push(val);
        saveData();
        render();
      }
    };
  });

  document.onclick = e => {
    if (openPopoverFor && !e.target.closest('.notes-wrap')) {
      openPopoverFor = null;
      render();
    }
  };
}

init();
