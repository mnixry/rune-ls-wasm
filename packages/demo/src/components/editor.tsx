import CodeMirror from "@uiw/react-codemirror";
import { useMemo } from "react";
import useSWRImmutable from "swr/immutable";
import {
  shikiHighlighter,
  shikiRuneHighlight,
} from "@/lib/language/highlighter";
import { createRuneLanguageServer } from "@/lib/language/server";

const EditorInner: React.FC<{ theme: "dark" | "light" }> = ({ theme }) => {
  const { data: highlighterExtension } = useSWRImmutable(
    `highlighter-${theme}`,
    async () => {
      const highlighter = await shikiHighlighter();
      return shikiRuneHighlight({ highlighter, theme });
    },
  );
  const { data: { client } = {} } = useSWRImmutable(
    `language-server`,
    async () => {
      const { client, server } = await createRuneLanguageServer({
        logLevel: "trace",
        subscribeErrorHandler: console.error,
      });
      return { client, server };
    },
  );

  const extensions = useMemo(() => {
    if (!highlighterExtension || !client) return [];
    return [
      highlighterExtension,
      client.plugin("file:///home/web_user/code.rune", "rune"),
    ];
  }, [highlighterExtension, client]);

  if (!highlighterExtension || !client) {
    return <div>Loading...</div>;
  }

  return <CodeMirror extensions={extensions} />;
};

export const Editor = () => {
  return <EditorInner theme="dark" />;
};
