import type {
  RuneLanguageServerEventListener,
  RuneLanguageServerEventsMap,
} from "@runels-wasm/browser";
import { useEffect } from "react";
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

export function useLanguageServerEvent<
  K extends keyof RuneLanguageServerEventsMap,
>(event: K, callback: RuneLanguageServerEventListener<K>) {
  const { server } = useLanguageServer() ?? {};
  useEffect(() => {
    server?.addEventListener(event, callback);
    return () => {
      server?.removeEventListener(event, callback);
    };
  }, [event, callback, server]);
}
