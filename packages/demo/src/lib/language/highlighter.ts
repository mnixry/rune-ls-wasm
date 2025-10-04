import { RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  type EditorView,
  type PluginValue,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import type { BundledLanguage, Highlighter, LanguageInput } from "shiki";
import { getSingletonHighlighter } from "shiki";
import runeSyntax from "./rune.tmLanguage.json";

export async function shikiHighlighter() {
  return await getSingletonHighlighter({
    themes: ["one-dark-pro", "one-light"],
    langs: [runeSyntax as unknown as LanguageInput],
  });
}

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

    protected applyShikiHl(view: EditorView) {
      const builder = new RangeSetBuilder<Decoration>();
      const doc = view.state.doc.toString();
      const tokens = this.toTokens(doc).tokens.flat();
      for (const { content, offset, color } of tokens) {
        if (!color) continue;
        builder.add(
          offset,
          offset + content.length,
          Decoration.mark({
            attributes: {
              style: `color: ${color}`,
            },
          }),
        );
      }
      return builder.finish();
    }
  }

  return ViewPlugin.fromClass(RuneHighlighterPlugin, {
    decorations: (v) => v.decorations,
  });
}
