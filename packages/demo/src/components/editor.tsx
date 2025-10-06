import ReactCodeMirror, {
  type ReactCodeMirrorProps,
} from "@uiw/react-codemirror";
import { Loader2 } from "lucide-react";
import { Suspense, useMemo } from "react";
import useSWRImmutable from "swr/immutable";
import { useTheme } from "@/components/theme-provider";
import {
  shikiHighlighter,
  shikiRuneHighlight,
} from "@/lib/language/highlighter";
import { createRuneLanguageServer } from "@/lib/language/server";
import { cn } from "@/lib/utils";

const EditorInner: React.FC<ReactCodeMirrorProps> = ({
  extensions: extensionsProp,
  ...props
}) => {
  const { computedTheme: theme } = useTheme();
  const { data: highlighterExtension } = useSWRImmutable(
    `highlighter-${theme}`,
    async () => {
      const highlighter = await shikiHighlighter();
      return shikiRuneHighlight({ highlighter, theme });
    },
    { suspense: true },
  );
  const {
    data: { client },
  } = useSWRImmutable(
    `language-server`,
    async () => {
      const { client, server } = await createRuneLanguageServer({
        logLevel: "trace",
      });
      return { client, server };
    },
    { suspense: true },
  );

  const extensions = useMemo(() => {
    return [
      highlighterExtension,
      client.plugin("file:///home/web_user/code.rune", "rune"),
      ...(extensionsProp ?? []),
    ];
  }, [highlighterExtension, client, extensionsProp]);

  return <ReactCodeMirror theme={theme} extensions={extensions} {...props} />;
};

const LoadingOverlay: React.FC<React.ComponentProps<"div">> = ({
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/50",
        className,
      )}
      {...props}
    >
      <Loader2 className="size-10 animate-spin" />
      <p className="text-foreground text-sm">Loading...</p>
    </div>
  );
};

export const Editor: React.FC<React.ComponentProps<typeof EditorInner>> = (
  props,
) => {
  return (
    <Suspense fallback={<LoadingOverlay />}>
      <EditorInner {...props} />
    </Suspense>
  );
};
