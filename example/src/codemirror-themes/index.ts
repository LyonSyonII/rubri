import type { Extension } from "@codemirror/state";

export async function importTheme(theme: string): Promise<Extension> {
  return theme === "light"
    ? (await import("./github-light")).githubLight
    : (await import("./github-dark")).githubDark;
}