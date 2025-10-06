import { RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  type EditorView,
  type PluginValue,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import type {
  BundledLanguage,
  Highlighter,
  LanguageInput,
  ThemedToken,
} from "shiki";
import { getSingletonHighlighter } from "shiki";
import { cn } from "@/lib/utils";
import runeSyntax from "./rune.tmLanguage.json";

export async function shikiHighlighter() {
  return await getSingletonHighlighter({
    themes: ["one-dark-pro", "one-light"],
    langs: [runeSyntax as unknown as LanguageInput],
  });
}

const styleDictToString = (style: Record<string, string>) => {
  const element = document.createElement("template");
  for (const [key, value] of Object.entries(style)) {
    element.style.setProperty(key, value);
  }
  return element.style.cssText;
};

export async function shikiRuneHighlight({
  highlighter,
  theme,
}: {
  highlighter: Highlighter;
  theme: "dark" | "light";
}) {
  class RuneHighlighterPlugin implements PluginValue {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.applyShikiHl(view);
    }

    update(upd: ViewUpdate) {
      if (upd.docChanged || upd.viewportChanged) {
        this.decorations = this.applyShikiHl(upd.view);
      }
    }

    docViewUpdate(view: EditorView): void {
      this.decorations = this.applyShikiHl(view);
    }

    protected toTokens(code: string) {
      return highlighter.codeToTokens(code, {
        theme: theme === "dark" ? "one-dark-pro" : "one-light",
        lang: runeSyntax as unknown as BundledLanguage,
      });
    }

    protected tokenToDecoration(token: ThemedToken) {
      const { color, bgColor, ...rest } = token;
      const classes = cn(
        "text-(--fg-color) bg-(--bg-color)",
        (
          {
            [-1]: "",
            0: "font-normal",
            1: "font-italic",
            2: "font-bold",
            4: "underline",
            8: "line-through",
          } as const
        )[rest.fontStyle ?? -1],
        rest.htmlAttrs?.class,
      );
      return Decoration.mark({
        class: classes,
        attributes: {
          ...rest.htmlAttrs,
          style: styleDictToString({
            "--fg-color": color ?? "transparent",
            "--bg-color": bgColor ?? "transparent",
            ...rest.htmlStyle,
          }),
        },
      });
    }

    protected applyShikiHl(view: EditorView) {
      const builder = new RangeSetBuilder<Decoration>();
      const doc = view.state.doc.toString();
      const tokens = this.toTokens(doc).tokens.flat();
      for (const token of tokens) {
        const { offset, content } = token;
        builder.add(
          offset,
          offset + content.length,
          this.tokenToDecoration(token),
        );
      }
      return builder.finish();
    }
  }

  return ViewPlugin.fromClass(RuneHighlighterPlugin, {
    decorations: (v) => v.decorations,
  });
}
