"use client";
import CodeMirror from "@uiw/react-codemirror";
import { go } from "@codemirror/lang-go";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { EditorView } from "@codemirror/view";
import { type Language } from "@/lib/catalog";
import { useTheme } from "./theme-provider";
const theme = EditorView.theme({
  "&": { fontSize: "16px" },
  ".cm-content": {
    fontFamily:
      '"Comic Sans MS", "Comic Sans", var(--font-comic-fallback), cursive',
    padding: "20px 0",
    minHeight: "420px",
  },
  ".cm-gutters": { border: "none", paddingRight: "14px" },
  ".cm-line": { padding: "0 12px", lineHeight: "1.8" },
  "&.cm-focused": { outline: "none" },
});
const extensions = {
  go: [go(), theme, EditorView.lineWrapping],
  python: [python(), theme, EditorView.lineWrapping],
  javascript: [javascript(), theme, EditorView.lineWrapping],
};
export default function CodeEditor({
  value,
  language,
  onChange,
  readOnly = false,
}: {
  value: string;
  language: Language;
  onChange: (value: string) => void;
  readOnly?: boolean;
}) {
  const { resolved } = useTheme();
  return (
    <CodeMirror
      value={value}
      theme={resolved}
      editable={!readOnly}
      readOnly={readOnly}
      extensions={extensions[language]}
      onChange={onChange}
      aria-label={`${language} code editor`}
      basicSetup={{
        foldGutter: true,
        autocompletion: true,
        highlightActiveLine: true,
      }}
    />
  );
}
