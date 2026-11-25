"use client";
import { useState } from "react";
import { THEME_COOKIE, type ThemePreference } from "@/lib/sun-theme";
import { MoonIcon, SunIcon, SunsetIcon } from "./icons";

const OPTIONS = [
  { key: "auto", label: "אוטומטי", Icon: SunsetIcon },
  { key: "light", label: "בהיר", Icon: SunIcon },
  { key: "dark", label: "כהה", Icon: MoonIcon },
] as const;

function savePreference(next: ThemePreference) {
  document.cookie = next === "auto"
    ? `${THEME_COOKIE}=; path=/; max-age=0; samesite=lax`
    : `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.dataset.themePref = next;
  (window as unknown as { __yivolApplyTheme?: () => void }).__yivolApplyTheme?.();
}

/** Admin-only display mode picker. The server only honours the cookie for admins. */
export function ThemeSwitcher({ initial }: { initial: ThemePreference }) {
  const [pref, setPref] = useState<ThemePreference>(initial);

  function choose(next: ThemePreference) {
    savePreference(next);
    setPref(next);
  }

  return (
    <div className="view-toggle" role="radiogroup" aria-label="מצב תצוגה">
      {OPTIONS.map(({ key, label, Icon }) => (
        <button key={key} type="button" role="radio" aria-checked={key === pref} className={`view-toggle-option theme-option${key === pref ? " is-active" : ""}`} onClick={() => choose(key)}>
          <Icon size={18} />
          {label}
        </button>
      ))}
    </div>
  );
}
