(() => {
  const STORAGE_KEY = "jg-lang";
  const DEFAULT_LANG = "en";
  const SUPPORTED = ["en", "sv"];

  function normalizeLang(value) {
    if (!value) return null;
    const v = String(value).toLowerCase();
    if (v === "auto") return "auto";
    if (v === "en" || v === "eng" || v.startsWith("en-")) return "en";
    if (v === "sv" || v === "swe" || v.startsWith("sv-")) return "sv";
    return null;
  }

  function detectLanguage() {
    if (typeof navigator === "undefined") return DEFAULT_LANG;
    const prefs = [];
    if (Array.isArray(navigator.languages)) {
      prefs.push(...navigator.languages);
    }
    if (navigator.language) prefs.push(navigator.language);
    for (const pref of prefs) {
      const normalized = normalizeLang(pref);
      if (normalized && SUPPORTED.includes(normalized)) return normalized;
    }
    return DEFAULT_LANG;
  }

  function getStoredSetting() {
    try {
      return normalizeLang(localStorage.getItem(STORAGE_KEY));
    } catch {
      return null;
    }
  }

  const setting = getStoredSetting() || "auto";
  const preferred = setting === "auto" ? detectLanguage() : setting;
  const root = document.documentElement;

  root.setAttribute("lang", preferred);
  root.setAttribute("data-lang", preferred);
  if (preferred !== DEFAULT_LANG) {
    root.setAttribute("data-i18n-pending", "true");
  } else {
    root.removeAttribute("data-i18n-pending");
  }
})();
