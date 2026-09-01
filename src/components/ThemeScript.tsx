// Applies the stored theme before first paint. Inline and synchronous on
// purpose: run it any later and the page flashes the wrong palette.
const script = `(() => {
  try {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") {
      document.documentElement.dataset.theme = stored;
    }
  } catch {}
})();`;

export default function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
