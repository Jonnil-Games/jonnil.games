/*
  jonnil.games – i18n.js
  Purpose: Client-side language selection + content swapping.
  Notes: Uses JSON dictionaries in /i18n/{lang}.json and falls back to English.
*/
(function () {
  const STORAGE_KEY = "jg-lang";
  const DEFAULT_LANG = "en";
  const SUPPORTED = ["en", "sv"];
  const LOCALE_MAP = {
    en: "en-US",
    sv: "sv-SE",
  };
  const ICONS = {
    auto: { type: "emoji", value: "🌐" },
    en: { type: "emoji", value: "🇺🇸" },
    sv: { type: "emoji", value: "🇸🇪" },
  };
  const LABEL_KEYS = {
    auto: "lang.auto",
    en: "lang.english",
    sv: "lang.swedish",
  };
  const LABEL_FALLBACKS = {
    auto: "Auto",
    en: "English",
    sv: "Svenska",
  };
  const I18N_HTML_ALLOWED_TAGS = new Set(["b", "br", "em", "i", "strong"]);
  const cache = new Map();

  let setting = null; // auto | en | sv
  let resolved = null; // en | sv
  let dict = null;
  let fallback = null;

  function normalizeLang(value) {
    if (!value) return null;
    const v = String(value).toLowerCase();
    if (v === "auto") return "auto";
    if (v === "en" || v === "eng" || v.startsWith("en-")) return "en";
    if (v === "sv" || v === "swe" || v.startsWith("sv-")) return "sv";
    return null;
  }

  function detectLanguage() {
    const prefs = [];
    if (Array.isArray(navigator.languages)) {
      prefs.push(...navigator.languages);
    }
    if (navigator.language) prefs.push(navigator.language);
    for (const pref of prefs) {
      const norm = normalizeLang(pref);
      if (norm && SUPPORTED.includes(norm)) return norm;
    }
    return DEFAULT_LANG;
  }

  function getStoredSetting() {
    try {
      const stored = normalizeLang(localStorage.getItem(STORAGE_KEY));
      return stored || "auto";
    } catch (err) {
      return "auto";
    }
  }

  function getLocale(lang) {
    return LOCALE_MAP[lang] || "en-US";
  }

  async function loadDict(lang) {
    if (cache.has(lang)) return cache.get(lang);
    const res = await fetch(`/i18n/${lang}.json`);
    if (!res.ok) throw new Error(`Failed to load i18n ${lang}`);
    const data = await res.json();
    cache.set(lang, data);
    return data;
  }

  function getValue(obj, path) {
    if (!obj) return null;
    const parts = String(path).split(".");
    let current = obj;
    for (const part of parts) {
      if (current == null) return null;
      current = current[part];
    }
    return current == null ? null : current;
  }

  function translate(key) {
    const value = getValue(dict, key);
    if (value != null) return value;
    const fb = getValue(fallback, key);
    return fb != null ? fb : null;
  }

  function applyAttributes(el, spec) {
    const pairs = String(spec)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    pairs.forEach((pair) => {
      const [attr, key] = pair.split(":").map((v) => v.trim());
      if (!attr || !key) return;
      if (!el.__jgI18nAttrDefault) el.__jgI18nAttrDefault = {};
      if (!(attr in el.__jgI18nAttrDefault)) {
        el.__jgI18nAttrDefault[attr] = el.getAttribute(attr) || "";
      }
      const value = translate(key);
      if (value != null) {
        el.setAttribute(attr, value);
      } else {
        el.setAttribute(attr, el.__jgI18nAttrDefault[attr]);
      }
    });
  }

  function sanitizeI18nHtml(rawHtml) {
    const template = document.createElement("template");
    template.innerHTML = String(rawHtml || "");

    const walker = document.createTreeWalker(
      template.content,
      NodeFilter.SHOW_ELEMENT,
    );
    const elements = [];
    let node = walker.nextNode();
    while (node) {
      elements.push(node);
      node = walker.nextNode();
    }

    elements.forEach((element) => {
      const tag = element.tagName.toLowerCase();
      if (!I18N_HTML_ALLOWED_TAGS.has(tag)) {
        const text = document.createTextNode(element.textContent || "");
        element.replaceWith(text);
        return;
      }

      while (element.attributes.length > 0) {
        element.removeAttribute(element.attributes[0].name);
      }
    });

    return template.innerHTML;
  }

  function applyTranslations(root) {
    const scope = root || document;

    scope.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (!el.dataset.i18nDefault) {
        el.dataset.i18nDefault = el.textContent || "";
      }
      const value = translate(key);
      el.textContent = value != null ? value : el.dataset.i18nDefault;
    });

    scope.querySelectorAll("[data-i18n-html]").forEach((el) => {
      const key = el.getAttribute("data-i18n-html");
      if (!el.dataset.i18nHtmlDefault) {
        el.dataset.i18nHtmlDefault = el.innerHTML || "";
      }
      const value = translate(key);
      const fallbackHtml = sanitizeI18nHtml(el.dataset.i18nHtmlDefault);
      el.innerHTML =
        value != null ? sanitizeI18nHtml(value) : fallbackHtml;
    });

    scope.querySelectorAll("[data-i18n-attr]").forEach((el) => {
      applyAttributes(el, el.getAttribute("data-i18n-attr"));
    });
  }

  function applyLangIcon(el, icon) {
    if (!el) return;
    el.classList.remove("is-svg");
    el.style.backgroundImage = "none";
    el.textContent = "";
    if (!icon) return;
    if (typeof icon === "string") {
      el.textContent = icon;
      return;
    }
    if (icon.type === "emoji") {
      el.textContent = icon.value || "";
      return;
    }
    if (icon.type === "svg" && icon.value) {
      el.classList.add("is-svg");
      el.style.backgroundImage = `url('${icon.value}')`;
    }
  }

  function updateLangSwitcher() {
    const icon = ICONS[setting] || ICONS.auto;
    const labelKey = LABEL_KEYS[setting] || LABEL_KEYS.auto;
    const label = translate(labelKey) || LABEL_FALLBACKS[setting] || "Auto";

    document.querySelectorAll("[data-lang-icon]").forEach((el) => {
      applyLangIcon(el, icon);
      el.setAttribute("title", label);
    });
    document.querySelectorAll("[data-lang-label]").forEach((el) => {
      el.textContent = label;
    });
    document.querySelectorAll("[data-lang-option]").forEach((el) => {
      const value = el.getAttribute("data-lang-option");
      el.setAttribute("aria-selected", value === setting ? "true" : "false");
    });
  }

  async function refresh() {
    setting = getStoredSetting();
    resolved = setting === "auto" ? detectLanguage() : setting;

    try {
      const [langDict, enDict] = await Promise.all([
        loadDict(resolved),
        resolved === "en" ? Promise.resolve(null) : loadDict("en"),
      ]);
      dict = langDict;
      fallback = enDict || langDict;
    } catch (err) {
      dict = null;
      fallback = null;
      // eslint-disable-next-line no-console
      console.warn("i18n load failed", err);
    }

    document.documentElement.setAttribute("lang", resolved);
    document.documentElement.setAttribute("data-lang", resolved);

    applyTranslations(document);
    updateLangSwitcher();
    document.documentElement.removeAttribute("data-i18n-pending");
    document.documentElement.setAttribute("data-i18n-ready", "true");

    const event = new CustomEvent("jg-i18n-ready", {
      detail: {
        setting,
        resolved,
        locale: getLocale(resolved),
      },
    });
    document.dispatchEvent(event);
  }

  function setLanguage(nextSetting) {
    const normalized = normalizeLang(nextSetting) || "auto";
    try {
      localStorage.setItem(STORAGE_KEY, normalized);
    } catch (err) {
      // ignore storage failures
    }
    return refresh();
  }

  function t(key, fallback) {
    const value = translate(key);
    if (value == null) return fallback != null ? fallback : key;
    return value;
  }

  function getState() {
    return {
      setting,
      resolved,
      locale: getLocale(resolved || DEFAULT_LANG),
    };
  }

  function bindSwitchers() {
    document.querySelectorAll("[data-lang-option-icon]").forEach((el) => {
      const value = el.getAttribute("data-lang-option-icon");
      if (!value) return;
      const icon = ICONS[value] || ICONS.auto;
      applyLangIcon(el, icon);
    });

    document.querySelectorAll("[data-lang-toggle]").forEach((toggle) => {
      if (toggle.__jgLangBound) return;
      toggle.__jgLangBound = true;
      toggle.addEventListener("click", (event) => {
        event.preventDefault();
        const picker = toggle.closest(".lang-switcher, .mobile-lang-switcher");
        if (!picker) return;
        const menu = picker.querySelector("[data-lang-menu]");
        if (!menu) return;
        const isOpen = menu.classList.contains("open");
        document
          .querySelectorAll("[data-lang-menu].open")
          .forEach((openMenu) => {
            openMenu.classList.remove("open");
            const t = openMenu
              .closest(".lang-switcher, .mobile-lang-switcher")
              ?.querySelector("[data-lang-toggle]");
            if (t) t.setAttribute("aria-expanded", "false");
          });
        menu.classList.toggle("open", !isOpen);
        toggle.setAttribute("aria-expanded", String(!isOpen));
      });
    });

    document.querySelectorAll("[data-lang-option]").forEach((option) => {
      if (option.__jgLangBound) return;
      option.__jgLangBound = true;
      option.addEventListener("click", () => {
        const value = option.getAttribute("data-lang-option");
        if (!value) return;
        setLanguage(value);
        const picker = option.closest(".lang-switcher, .mobile-lang-switcher");
        const menu = picker?.querySelector("[data-lang-menu]");
        const toggle = picker?.querySelector("[data-lang-toggle]");
        if (menu) menu.classList.remove("open");
        if (toggle) toggle.setAttribute("aria-expanded", "false");
      });
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      document.querySelectorAll("[data-lang-menu].open").forEach((menu) => {
        const picker = menu.closest(".lang-switcher, .mobile-lang-switcher");
        if (picker && picker.contains(target)) return;
        menu.classList.remove("open");
        const toggle = picker?.querySelector("[data-lang-toggle]");
        if (toggle) toggle.setAttribute("aria-expanded", "false");
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      document.querySelectorAll("[data-lang-menu].open").forEach((menu) => {
        menu.classList.remove("open");
        const toggle = menu
          .closest(".lang-switcher, .mobile-lang-switcher")
          ?.querySelector("[data-lang-toggle]");
        if (toggle) toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    bindSwitchers();
  });

  window.JG_I18N = {
    t,
    setLanguage,
    getState,
    refresh,
    getLocale,
  };

  refresh();
})();
