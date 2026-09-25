# Search and replace helper / 搜索替换助手

A lightweight find-and-replace panel for [Obsidian](https://obsidian.md) that you can summon with **Alt+D** over any note. It highlights matches as you type and jumps straight from writing to a targeted find-and-replace.

一个轻量的 Obsidian 查找替换面板，在任何笔记上按 **Alt+D** 即可呼出。随着输入实时高亮所有匹配项，让你无需打开原生搜索面板或笨重的弹窗，就能快速定位并替换内容。

---

## English

### Features

- **Floating, draggable, semi-transparent panel** – non-modal by design; keep it out of the way while you edit.
- **Selection-aware scope** – with a selection, all find-and-replace actions run *inside* the selection; otherwise the whole note is searched.
- **Live highlighting + match count** – matches are highlighted in the editor as you type, with a `current/total` counter.
- **Options** – plain text or regular expression, and match-case toggle.
- **Keyboard-first**:
  - `Enter` – replace the current match and jump to the next one.
  - `Shift+Enter` – replace all matches in scope.
  - `↑` / `↓` – move between matches without replacing.
  - `Tab` – move between the find and replace fields.
  - `Esc` – close the panel and clear all highlights.
- **Full undo** – every replacement is a regular CodeMirror change, so `Ctrl+Z` / `Ctrl+Shift+Z` works as expected. Replace-all is a single undo step.

### Requirements

- Obsidian (desktop) 1.0.0+. The plugin is desktop-only because it relies on the floating overlay and keyboard workflow.

### Installation

#### From the plugin directory

1. Download `main.js`, `manifest.json` and `styles.css` from the latest [release](https://github.com/your-name/search-replace-helper/releases).
2. Move them into your vault: `<vault>/.obsidian/plugins/search-replace-helper/`.
3. Enable **Search and replace helper** under **Settings → Community plugins**.

#### From source

```bash
npm install
npm run build
```

This produces `main.js`, `manifest.json` and `styles.css` in the repository root. Copy them to `<vault>/.obsidian/plugins/search-replace-helper/` and reload Obsidian.

### Usage

1. Place the cursor in a note, select a range, or simply press **Alt+D**.
2. Start typing in the **Find** field. Matches are highlighted immediately and the counter shows `current/total`.
3. Type a replacement in the **Replace** field.
4. Press **Enter** to replace the current match and move to the next, or **Shift+Enter** to replace them all.
5. Press **Esc** to close the panel and remove all highlights.

The hotkey can be changed at any time in **Settings → Hotkeys**.

### Options

| Setting                 | Description                                                     |
| ----------------------- | --------------------------------------------------------------- |
| Prefill from selection  | Start search with the currently selected text.                  |
| Regex by default        | Interpret the find text as a regular expression by default.      |
| Match case by default   | Make searches case-sensitive by default.                        |
| Popup opacity           | Adjust transparency of the floating panel.                      |
| Remember popup position | Reopen the panel at its last position within the session.       |

### Regular expressions

Toggle the `.*` button to search with regular expressions (JavaScript syntax). Replacement strings support capture groups: `$1`, `$2`, …, `$&` (the whole match) and `$$` (a literal `$`). In plain-text mode, `\n`, `\t` and `\r` in the replacement are converted to their literal characters.

### Notes & limitations

- To keep the plugin lightweight, at most 2000 matches are shown/replaced per scope; the counter displays e.g. `12/2000+` when this limit is hit.
- Zero-width regex matches are ignored for highlighting and replacement.
- The panel is not persisted across app restarts, and it follows the note it was opened on; switching to another note closes it.

### Development

```bash
npm run dev    # watch mode
npm run build  # production build
npm run lint   # lint and type checks
```

### License

See [LICENSE](./LICENSE).

---

## 中文

### 功能特性

- **悬浮可拖拽的半透明面板** – 非模态设计，编辑时不会遮挡、也不打断你的操作。
- **选区感知的作用范围** – 选中文本时，所有查找/替换操作只作用于选区内部；没有选区时则搜索整个笔记。
- **实时高亮与计数** – 输入的同时在编辑器中高亮所有匹配项，并显示 `当前/总数` 计数。
- **选项开关** – 纯文本或正则表达式，以及区分大小写开关。
- **键盘优先操作**：
  - `Enter` – 替换当前匹配项并跳到下一处。
  - `Shift+Enter` – 替换作用范围内的所有匹配项。
  - `↑` / `↓` – 在匹配项之间移动（不进行替换）。
  - `Tab` – 在「查找」和「替换」输入框之间切换。
  - `Esc` – 关闭面板并清除所有高亮。
- **完整撤销** – 每次替换都是普通的 CodeMirror 修改，因此 `Ctrl+Z` / `Ctrl+Shift+Z` 都能正常撤销。其中「全部替换」是单一步骤，可一步撤销。

### 系统要求

- Obsidian（桌面端）1.0.0 及以上。本插件仅支持桌面端，因为它依赖悬浮浮层和键盘操作流程。

### 安装

#### 从插件目录安装

1. 从最新 [release](https://github.com/your-name/search-replace-helper/releases) 下载 `main.js`、`manifest.json` 和 `styles.css`。
2. 将它们放入你的仓库目录：`<vault>/.obsidian/plugins/search-replace-helper/`。
3. 在 **设置 → 第三方插件** 中启用 **搜索替换助手**。

#### 从源码构建

```bash
npm install
npm run build
```

构建完成后会在仓库根目录生成 `main.js`、`manifest.json` 和 `styles.css`。把它们复制到 `<vault>/.obsidian/plugins/search-replace-helper/` 并重新加载 Obsidian 即可。

### 使用方法

1. 将光标置于笔记中、选中一段文本，或直接按 **Alt+D**。
2. 在 **查找** 输入框中输入内容，匹配项会立即高亮并显示 `当前/总数`。
3. 在 **替换** 输入框中输入替换文本。
4. 按 **Enter** 替换当前匹配项并跳到下一处，或按 **Shift+Enter** 全部替换。
5. 按 **Esc** 关闭面板并清除所有高亮。

热键可随时在 **设置 → 快捷键** 中进行修改。

### 设置项

| 设置项               | 说明                                         |
| -------------------- | -------------------------------------------- |
| 从选区预填           | 以当前选中的文本作为初始搜索词。             |
| 默认使用正则         | 默认将查找内容解释为正则表达式。             |
| 默认区分大小写       | 默认开启大小写敏感搜索。                     |
| 面板透明度           | 调节悬浮面板的透明度。                       |
| 记住面板位置         | 在本次会话中记住并恢复面板上次的位置。       |

### 正则表达式

点击 `.*` 按钮可启用正则搜索（JavaScript 语法）。替换文本支持捕获组：`$1`、`$2`、…、`$&`（整个匹配）以及 `$$`（字面量 `$`）。在纯文本模式下，替换文本中的 `\n`、`\t` 和 `\r` 会被转换为对应的字面字符。

### 说明与限制

- 为了保持插件轻量，每个作用范围内最多展示/替换 2000 个匹配项；达到上限时计数会显示为 `12/2000+` 等格式。
- 零宽度的正则匹配会被忽略，不参与高亮和替换。
- 面板在应用重启后不会保留，并跟随打开它所对应的笔记；切换到其他笔记时面板会自动关闭。

### 开发

```bash
npm run dev    # 监听模式
npm run build  # 生产构建
npm run lint   # lint 与类型检查
```

### 许可证

参见 [LICENSE](./LICENSE)。
