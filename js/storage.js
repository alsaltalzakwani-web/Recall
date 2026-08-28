/* Per-device persistence via localStorage. No accounts, no server. */
const Storage = {
  DATA_KEY: 'recall.subjects.v1',
  SETTINGS_KEY: 'recall.settings.v1',

  loadSubjects() {
    try {
      const raw = localStorage.getItem(this.DATA_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Recall: failed to load data', e);
      return [];
    }
  },

  saveSubjects(subjects) {
    try {
      localStorage.setItem(this.DATA_KEY, JSON.stringify(subjects));
    } catch (e) {
      console.error('Recall: failed to save data', e);
    }
  },

  loadSettings() {
    try {
      const raw = localStorage.getItem(this.SETTINGS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  saveSettings(settings) {
    try {
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Recall: failed to save settings', e);
    }
  },
};
