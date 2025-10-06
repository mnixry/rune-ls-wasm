import useSWRImmutable from "swr/immutable";
import { shikiHighlighter, shikiRuneHighlight } from "./language/highlighter";
import { createRuneLanguageServer } from "./language/server";

export function useHighlighterExtension(theme: "dark" | "light") {
  const { data } = useSWRImmutable(`highlighter-${theme}`, async () => {
    const highlighter = await shikiHighlighter();
    return shikiRuneHighlight({ highlighter, theme });
  });
  return data;
}

export function useLanguageServer() {
  const { data } = useSWRImmutable(`language-server`, async () => {
    const { client, server } = await createRuneLanguageServer({
      logLevel: "trace",
    });
    return { client, server };
  });
  return data;
}
