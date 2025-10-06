import ReactCodeMirror, {
  type ReactCodeMirrorProps,
} from "@uiw/react-codemirror";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useInterval } from "react-use";
import { useTheme } from "@/components/theme-provider";
import { useHighlighterExtension, useLanguageServer } from "@/lib/hooks";
import { cn } from "@/lib/utils";

export const Editor: React.FC<ReactCodeMirrorProps> = ({
  extensions: extensionsProp,
  ...props
}) => {
  const { computedTheme: theme } = useTheme();
  const highlighterExtension = useHighlighterExtension(theme);
  const { client } = useLanguageServer() ?? {};

  const extensions = useMemo(() => {
    const extensions = extensionsProp ?? [];
    if (highlighterExtension) extensions.push(highlighterExtension);
    if (client)
      extensions.push(client.plugin("file:///home/web_user/code.rune", "rune"));
    return extensions;
  }, [highlighterExtension, client, extensionsProp]);

  if (!client || !highlighterExtension) {
    return <LoadingOverlay />;
  }

  return <ReactCodeMirror theme={theme} extensions={extensions} {...props} />;
};

const LoadingOverlay: React.FC<React.ComponentProps<"div">> = ({
  className,
  ...props
}) => {
  const [loadingDots, setLoadingDots] = useState(".");
  useInterval(() => {
    setLoadingDots((dots) => (dots.length < 3 ? `${dots}.` : ""));
  }, 500);
  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/50",
        className,
      )}
      {...props}
    >
      <Loader2 className="size-10 animate-spin" />
      <p className="text-foreground text-sm">Loading{loadingDots}</p>
    </div>
  );
};
