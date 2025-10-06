import { AnsiHtml } from "fancy-ansi/react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useRafState } from "react-use";
import {
  List,
  type RowComponentProps,
  useDynamicRowHeight,
  useListCallbackRef,
} from "react-window";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useLanguageServerEvent } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import styles from "./logs.module.css";
import { useTheme } from "./theme-provider";

type LogsProps = React.ComponentProps<"div">;

function LogRow({
  index,
  style,
  lines,
}: RowComponentProps<{ lines: string[] }>) {
  return (
    <div
      style={style}
      className="w-full px-2 py-0.5 font-mono hover:bg-accent transition-colors"
    >
      <AnsiHtml
        className="whitespace-break-spaces break-all block"
        text={lines[index]}
      />
    </div>
  );
}

export const Logs: React.FC<LogsProps> = ({ className, ...props }) => {
  const { computedTheme } = useTheme();
  const linesRef = useRef<string[]>([]);
  const [lines, setLines] = useRafState<string[]>([]);
  const [autoScrolling, setAutoScrolling] = useState(true);
  const [listApi, listRef] = useListCallbackRef(null);
  const rowHeight = useDynamicRowHeight({ defaultRowHeight: 20 });

  // const setLinesDebounced = useDebounceCallback(setLines, 100);

  const onLog = useCallback(
    (e: CustomEvent<string>) => {
      linesRef.current.push(e.detail);
      setLines(linesRef.current.slice());
    },
    [setLines],
  );

  useLanguageServerEvent("log", onLog);

  // Auto-scroll to bottom on new lines when enabled
  useLayoutEffect(() => {
    if (!(autoScrolling && listApi && lines.length > 0)) return;
    listApi.scrollToRow({
      index: lines.length - 1,
      align: "end",
      behavior: "auto",
    });
  }, [autoScrolling, listApi, lines.length]);

  return (
    <div
      className={cn(
        "relative h-full bg-card text-card-foreground flex flex-col",
        className,
      )}
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      {...props}
    >
      <div className="z-10 p-2 w-full bg-card/50 backdrop-blur-sm flex items-center justify-between border-b border-border">
        <p className="text-sm text-muted-foreground">{lines.length} lines</p>
        <div className="flex items-center gap-2">
          <Label>Auto Scrolling</Label>
          <Switch checked={autoScrolling} onCheckedChange={setAutoScrolling} />
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <List
          className={cn(
            "h-full",
            computedTheme === "dark" ? styles.logsDark : styles.logs,
          )}
          rowComponent={LogRow}
          rowCount={lines.length}
          rowHeight={rowHeight}
          rowProps={{ lines }}
          listRef={listRef}
          overscanCount={10}
        />
      </div>
    </div>
  );
};
