// Keeps the copyright year fresh
(function () {
  const root = document.querySelector("footer");
  if (!root) return;
  const el = root.querySelector("#year");
  if (el) el.textContent = String(new Date().getFullYear());
})();
