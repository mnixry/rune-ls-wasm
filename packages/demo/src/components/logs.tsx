import type { LogMessage } from "@runels-wasm/browser";
import { ArrowRightIcon } from "lucide-react";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRafState } from "react-use";
import {
  List,
  type RowComponentProps,
  useDynamicRowHeight,
  useListCallbackRef,
} from "react-window";
import { useTheme } from "@/components/theme-provider";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useLanguageServerEvent } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import styles from "./logs.module.css";

const textToColor = (text: string) => {
  const hash = text.split("").reduce((acc, char) => {
    return (acc + char.charCodeAt(0)) % 17;
  }, 0);
  switch (hash) {
    case 0:
      return "dark:text-red-400 text-red-600";
    case 1:
      return "dark:text-orange-400 text-orange-600";
    case 2:
      return "dark:text-amber-400 text-amber-600";
    case 3:
      return "dark:text-yellow-400 text-yellow-600";
    case 4:
      return "dark:text-lime-400 text-lime-600";
    case 5:
      return "dark:text-green-400 text-green-600";
    case 6:
      return "dark:text-emerald-400 text-emerald-600";
    case 7:
      return "dark:text-teal-400 text-teal-600";
    case 8:
      return "dark:text-cyan-400 text-cyan-600";
    case 9:
      return "dark:text-sky-400 text-sky-600";
    case 10:
      return "dark:text-blue-400 text-blue-600";
    case 11:
      return "dark:text-indigo-400 text-indigo-600";
    case 12:
      return "dark:text-violet-400 text-violet-600";
    case 13:
      return "dark:text-purple-400 text-purple-600";
    case 14:
      return "dark:text-fuchsia-400 text-fuchsia-600";
    case 15:
      return "dark:text-pink-400 text-pink-600";
    case 16:
      return "dark:text-rose-400 text-rose-600";
  }
};

function LogRow({
  index,
  style,
  lines,
}: RowComponentProps<{ lines: LogMessage[] }>) {
  const {
    [index]: { timestamp, level, target, fields, spans = [] },
  } = lines;
  return (
    <div
      style={style}
      className="w-full px-2 py-0.5 font-mono hover:bg-accent transition-colors text-sm flex items-center gap-1"
    >
      <pre className="whitespace-break-spaces break-all block">
        <span className="text-muted-foreground font-thin">
          {new Date(timestamp).toLocaleTimeString()}{" "}
        </span>
        <span
          data-level={level.toLowerCase()}
          className={cn(
            "capitalize",
            "dark:data-[level=trace]:text-fuchsia-700 data-[level=trace]:text-fuchsia-400",
            "dark:data-[level=debug]:text-sky-700 data-[level=debug]:text-sky-400",
            "dark:data-[level=info]:text-emerald-700 data-[level=info]:text-emerald-400",
            "dark:data-[level=warn]:text-amber-700 data-[level=warn]:text-amber-400",
            "dark:data-[level=error]:text-rose-700 data-[level=error]:text-rose-400",
          )}
        >
          {level.padEnd(8)}
        </span>
        <span className={cn("font-thin", textToColor(target))}>{target} </span>
        {spans.length > 0 &&
          spans.map((span, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: span might have duplicates
            <span key={index} className="text-muted-foreground font-bold">
              {span.name}
              {index < spans.length - 1 ? (
                <ArrowRightIcon className="inline-block size-3 mx-1" />
              ) : (
                " "
              )}
            </span>
          ))}
        {fields.message && (
          <span className="w-full font-bold italic">{fields.message}</span>
        )}
        {Object.entries(fields)
          .filter(([key]) => key !== "message")
          .map(([key, value]) => (
            <span key={key}>
              <span className="text-muted-foreground">{key}=</span>
              <span>
                {typeof value === "string" ? value : JSON.stringify(value)}
              </span>{" "}
            </span>
          ))}
      </pre>
    </div>
  );
}

const loglevelFilter = (line: LogMessage, level: string) => {
  const levelMap = {
    trace: 0,
    debug: 1,
    info: 2,
    warn: 3,
    error: 4,
  } as Record<string, number>;
  const {
    [line.level.toLowerCase()]: lineLevel = 4,
    [level.toLowerCase()]: levelLevel = 0,
  } = levelMap;
  return lineLevel >= levelLevel;
};

export const Logs: React.FC<React.ComponentProps<"div">> = ({
  className,
  ...props
}) => {
  const { computedTheme } = useTheme();
  const linesRef = useRef<LogMessage[]>([]);
  const [lines, setLines] = useRafState<LogMessage[]>([]);
  const [autoScrolling, setAutoScrolling] = useState(true);
  const [listApi, listRef] = useListCallbackRef(null);
  const rowHeight = useDynamicRowHeight({ defaultRowHeight: 20 });

  const onLog = useCallback(
    (e: CustomEvent<LogMessage>) => {
      linesRef.current.push(e.detail);
      setLines(linesRef.current.slice());
    },
    [setLines],
  );

  useLanguageServerEvent("log", onLog);

  const [level, setLevel] = useState("debug");
  const filteredLines = useMemo(() => {
    return lines.filter((line) => loglevelFilter(line, level));
  }, [lines, level]);

  // Auto-scroll to bottom on new lines when enabled
  useLayoutEffect(() => {
    if (!(autoScrolling && listApi && filteredLines.length > 0)) return;
    listApi.scrollToRow({
      index: filteredLines.length - 1,
      align: "end",
      behavior: "auto",
    });
  }, [autoScrolling, listApi, filteredLines.length]);

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
      <div className="z-10 p-2 w-full bg-card/50 backdrop-blur-sm flex items-center gap-2 border-b border-border">
        <p className="text-sm text-muted-foreground flex-1">
          {lines.length} lines ({filteredLines.length} displayed)
        </p>
        <div className="flex items-center gap-2">
          <Label>Level</Label>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger size="sm">
              <SelectValue placeholder="Select a level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="trace">Trace</SelectItem>
              <SelectItem value="debug">Debug</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warn">Warn</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
          rowCount={filteredLines.length}
          rowHeight={rowHeight}
          rowProps={{ lines: filteredLines }}
          listRef={listRef}
          overscanCount={10}
        />
      </div>
    </div>
  );
};
