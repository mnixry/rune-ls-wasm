import { MoonIcon, SunIcon, SunMoonIcon } from "lucide-react";
import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { useLocalStorage, useMedia } from "react-use";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export const ModeToggle: React.FC<React.ComponentProps<typeof Button>> = ({
  className,
  ...props
}) => {
  const { setTheme, theme } = useTheme();

  const onClick = useCallback(() => {
    startTransition(() => {
      setTheme(
        ({ light: "dark", dark: "system", system: "light" } as const)[theme],
      );
    });
  }, [setTheme, theme]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          onClick={onClick}
          className={cn("relative", className)}
          {...props}
        >
          <SunIcon
            aria-hidden={theme !== "light"}
            className="absolute size-4 rotate-0 scale-100 transition-all aria-hidden:-rotate-90 aria-hidden:scale-0"
          />
          <MoonIcon
            aria-hidden={theme !== "dark"}
            className="absolute size-4 rotate-0 scale-100 transition-all aria-hidden:-rotate-90 aria-hidden:scale-0"
          />
          <SunMoonIcon
            aria-hidden={theme !== "system"}
            className="absolute size-4 rotate-0 scale-100 transition-all aria-hidden:-rotate-90 aria-hidden:scale-0"
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        Toggle theme
        <span className="capitalize">{` (current: ${theme})`}</span>
      </TooltipContent>
    </Tooltip>
  );
};

export type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  computedTheme: "dark" | "light";
  setTheme: (theme: Theme) => void;
};

const ThemeProviderContext = createContext<ThemeProviderState | null>(null);

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}) => {
  const [theme, setTheme] = useLocalStorage<Theme>(storageKey, defaultTheme);
  const prefersDark = useMedia("(prefers-color-scheme: dark)");
  const computedTheme = useMemo(
    () =>
      theme === "light" || theme === "dark"
        ? theme
        : prefersDark
          ? "dark"
          : "light",
    [theme, prefersDark],
  );

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(computedTheme);
  }, [computedTheme]);

  const value = useMemo(
    () => ({
      theme: theme ?? defaultTheme,
      computedTheme,
      setTheme,
    }),
    [theme, defaultTheme, setTheme, computedTheme],
  );

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === null)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
