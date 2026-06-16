// Monaco Editor 客户端引导模块：注册各语言 worker 后导出 monaco 实例。
// 该模块体积大，只允许在浏览器端通过动态 import 加载（如 Diff 弹窗内）。
import * as monaco from "monaco-editor"
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker"
import JsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker"
import CssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker"
import HtmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker"
import TsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker"

self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    if (label === "json") {
      return new JsonWorker()
    }
    if (label === "css" || label === "scss" || label === "less") {
      return new CssWorker()
    }
    if (label === "html" || label === "handlebars" || label === "razor") {
      return new HtmlWorker()
    }
    if (label === "typescript" || label === "javascript") {
      return new TsWorker()
    }
    return new EditorWorker()
  },
}

// 自定义主题：贴合应用本身的中性灰底色与红绿差异配色，弱化 Monaco 默认的高饱和蓝。
monaco.editor.defineTheme("mactfs-light", {
  base: "vs",
  inherit: true,
  rules: [],
  colors: {
    "editor.background": "#ffffff",
    "editor.foreground": "#1f1f1f",
    "editor.lineHighlightBackground": "#00000005",
    "editorLineNumber.foreground": "#a3a3a3",
    "editorLineNumber.activeForeground": "#525252",
    "editorCursor.foreground": "#4f46e5",
    "focusBorder": "#00000000",
    "diffEditor.insertedTextBackground": "#22c55e2e",
    "diffEditor.insertedLineBackground": "#22c55e14",
    "diffEditor.removedTextBackground": "#ef44442e",
    "diffEditor.removedLineBackground": "#ef444414",
    "diffEditorGutter.insertedLineBackground": "#22c55e21",
    "diffEditorGutter.removedLineBackground": "#ef444421",
    "diffEditorOverview.insertedForeground": "#22c55e99",
    "diffEditorOverview.removedForeground": "#ef444499",
    "diffEditor.unchangedRegionBackground": "#fafafa",
    "diffEditor.unchangedRegionForeground": "#737373",
    "scrollbarSlider.background": "#0000001f",
    "scrollbarSlider.hoverBackground": "#00000033",
    "scrollbarSlider.activeBackground": "#00000040",
  },
})

/**
 * 按文件路径后缀匹配 Monaco 已注册语言，匹配不到时回退纯文本。
 */
export function detectLanguage(path: string): string {
  const name = path.slice(path.lastIndexOf("/") + 1).toLowerCase()
  const dot = name.lastIndexOf(".")
  const ext = dot >= 0 ? name.slice(dot) : ""
  if (ext.length === 0) {
    return "plaintext"
  }
  for (const language of monaco.languages.getLanguages()) {
    if (language.extensions?.some((item) => item.toLowerCase() === ext)) {
      return language.id
    }
  }
  return "plaintext"
}

export { monaco }
