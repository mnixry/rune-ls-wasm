import { useState } from "react";
import { useMeasure } from "react-use";
import { Logs } from "@/components/logs";
import { ModeToggle } from "@/components/theme-provider";
import { Editor } from "./components/editor";

const App: React.FC = () => {
  const [ref, { width, height }] = useMeasure();
  const [value, onChange] = useState("");

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Rune Language Server Demo</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Try the Rune language server on browser WebAssembly with
              CodeMirror editor
            </p>
          </div>
          <ModeToggle aria-label="Toggle theme" />
        </div>
      </header>
      <main className="flex-1 overflow-hidden">
        <div className="grid h-full lg:grid-rows-1 lg:grid-cols-2 grid-rows-2">
          <section
            className="relative min-h-0"
            ref={ref as React.Ref<HTMLDivElement>}
          >
            <Editor
              className="h-full"
              height={`${height}px`}
              width={`${width}px`}
              value={value}
              onChange={onChange}
            />
          </section>
          <section className="min-h-[30vh]">
            <Logs />
          </section>
        </div>
      </main>
    </div>
  );
};

export default App;
