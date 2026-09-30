# Search and replace helper / 搜索替换助手

> Select text. Invoke your configured shortcut. Type what you want to find. Press `Enter`.
>
> 选中文字，按下你配置的快捷键，输入想查找的内容，按 `Enter`。

A focused find-and-replace panel for [Obsidian](https://obsidian.md) that removes the most annoying extra step: selected text is never copied into the query field. The selected range is highlighted in your chosen color, the **Find** field starts empty, and matches appear in a separate color. The configured shortcut toggles the panel, so there is no need to click the close button.

一个专注于查找替换的 Obsidian 面板，专门去掉最麻烦的多余一步：选中的文字不会被复制到查询框。选区会使用你选择的颜色高亮，**查找** 输入框从空白开始，命中结果会用另一种颜色显示。配置的快捷键可以切换面板开关，因此不必再手工点击关闭按钮。

---

## English

### Why it exists

A typical find-and-replace flow creates needless cleanup:

1. Select the text you want to edit.
2. Open find and replace; the selection is copied into the query.
3. Delete the copied text.
4. Type the query you actually meant.
5. Replace.

This plugin removes the middle cleanup step. The selection remains the search scope, while the query field stays empty until you type what you actually want to find.

### The shortest workflow

1. Select text.
2. Invoke **Find and replace** from the command palette or your configured hotkey. Press the same hotkey again to close it.
3. Type the desired query in the empty **Find** field.
4. Press `Enter` to replace the current match, or `Shift+Enter` to replace all matches.

### Features

- **No prefill, no cleanup** – the selected text is never copied into the query field, so you can start searching immediately.
- **Selection-aware scope** – with a selection, all find-and-replace actions run *inside* the selection; otherwise the whole note is searched.
- **Two-stage highlighting** – choose the selected-scope color in settings; matches and the current match use separate, clearer colors.
- **Readable, resizable panel** – adjust the panel font size in settings and drag its lower-right corner to resize it.
- **Live match count** – type to see the `current/total` counter update immediately.
- **Options** – plain text or regular expression, and match-case toggle.
- **Search history and favorites** – every find and replace combo you use is recorded, and the two ways to reuse it are deliberately different:
  - **`Alt+H` (small batch)** – select text, press the history shortcut, pick a combo, and it replaces **every match in the selection** in one undo step. The panel never opens.
  - **`🕐` in the panel (fine tuning)** – pick a combo to load it into the panel, then adjust it and press `Enter` / `Shift+Enter` as usual. Nothing is replaced by choosing.
  - Every row shows how many matches the combo currently has in your selection, so you can commit without opening anything. Star a combo to pin it to **Favorites** so it is never dropped.
- **Keyboard-first replacement**:
  - `Enter` – replace the current match and jump to the next one.
  - `Shift+Enter` – replace all matches in scope.
  - `↑` / `↓` – move between matches without replacing.
  - `Tab` – move between the find and replace fields.
  - `Esc` – close the panel and clear all highlights.
  - Your configured **Find and replace** shortcut opens the panel when closed and closes it when already open.
- **Full undo** – every replacement is a regular CodeMirror change, so `Ctrl+Z` / `Ctrl+Shift+Z` works as expected. Replace-all is a single undo step.

### Requirements

- Obsidian (desktop) 1.0.1+. The plugin is desktop-only because it relies on the floating overlay and keyboard workflow.

### Installation

#### From the plugin directory

1. Download `main.js`, `manifest.json` and `styles.css` from the latest [release](https://github.com/SpiderK-104/search-replace-helper/releases).
2. Move them into your vault: `<vault>/.obsidian/plugins/search-replace-helper/`.
3. Enable **Search and replace helper** under **Settings → Community plugins**.

#### From source

```bash
npm install
npm run build
```

This produces `main.js`, `manifest.json` and `styles.css` in the repository root. Copy them to `<vault>/.obsidian/plugins/search-replace-helper/` and reload Obsidian.

### Usage

1. Select the text you want to edit.
2. Invoke **Find and replace** from the command palette or your configured hotkey. The same hotkey closes the panel when it is already open.
3. The selected range is highlighted in your chosen color while the **Find** field stays empty. Type the query you want; matches appear in a different highlight color.
4. Type the replacement in the **Replace** field.
5. Press **Enter** to replace the current match, or **Shift+Enter** to replace all matches. Press **Esc** or the same hotkey to close the panel.

There is no need to delete the selected text from the query field: it is never inserted there. Assign **Find and replace** to your preferred key in **Settings → Hotkeys**; the command toggles the panel without requiring a mouse click.

### Options

| Setting                 | Description                                                |
| ----------------------- | ---------------------------------------------------------- |
| Regex by default        | Interpret the find text as a regular expression by default. |
| Match case by default   | Make searches case-sensitive by default.                   |
| Selection highlight color | Choose the color used for the selected search scope.      |
| Popup opacity           | Adjust transparency of the floating panel.                 |
| Popup font size         | Adjust the font size of the floating panel.                 |
| Remember popup position | Reopen the panel at its last position within the session.  |
| Remember find and replace history | Record each find and replace combo for reuse.      |
| History entries to keep | How many recent combos to keep. Favorites are never dropped.|
| History shortcut        | Shortcut that applies a combo to the selection, `Alt+H` by default. |
| Clear history           | Remove every saved combo, including favorites.             |

### Search history

Each combo records the find text, the replacement, and both toggles, because `**` means something very different with `.*` on and off. Use the `🕐` button in the panel, the history shortcut, or the **Apply find and replace history to the selection** command.

There are two ways to use a combo, and they do different things on purpose:

| Entry point | What picking a combo does |
| ------------ | -------------------------- |
| `Alt+H`, or the command, with a selection active | Replaces **every match in the selection** in one undo step. The panel does not open. |
| `🕐` in the panel | Loads the combo into **Find** and **Replace** and changes nothing. Press `Enter` / `Shift+Enter` when you are happy with it. |

In the picker:

- The right-hand badge is the live match count for the current selection. It is `0` when nothing would change, and `invalid` when the stored pattern no longer compiles.
- `Favorites` are listed first and are never removed by the size limit.
- `Recently used` is most-recent-first, capped by **History entries to keep**. Applying a combo counts as using it.
- An empty replacement is shown as *Delete*.
- `.*` and `Aa` badges show the toggles the combo will restore.
- Click the star, or press `Mod+Shift+F`, to favorite the highlighted combo.

`Alt+H` requires a selection and never falls back to the whole note – if there is no selection it just tells you to select some text. Running it twice is safe: the second run finds no matches and does nothing. A notice reports how many matches were replaced, and `Ctrl+Z` reverts the whole operation in one step.

A combo is recorded when you replace, replace all, or close the panel. History lives in this vault's plugin data, which Obsidian Sync will synchronize. Use **Clear history** to remove it.

### Regular expressions

Toggle the `.*` button to search with regular expressions (JavaScript syntax). The footer shows a **Regex** chip whenever it is on and a **Selection** chip whenever the search is limited to the selected text. Replacement strings support capture groups: `$1`, `$2`, …, `$&` (the whole match) and `$$` (a literal `$`). In plain-text mode, `\n`, `\t` and `\r` in the replacement are converted to their literal characters.

Inside a selection, `^` and `$` refer to the start and end of that selection, so `^##` matches a heading that begins exactly where your selection starts. Trailing spaces in the pattern still count: `^一、` matches, but `^一、 ` only matches when a space follows the `、`. When nothing matches, the footer names the likely reason: leading or trailing spaces, a pattern that looks like a regex while `.*` is off, or an invalid pattern.

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

### 为什么需要它

传统查找替换经常带来一段没有价值的清理工作：

1. 选中要修改的文字。
2. 打开查找替换，选中的文字被复制到查询框。
3. 先删除复制过来的文字。
4. 再输入真正想查找的内容。
5. 最后执行替换。

本插件直接去掉中间的清理步骤：选区继续作为搜索范围，查询框保持空白，你只需要输入真正想查找的内容。

### 最短操作路径

1. 选中文字。
2. 从命令面板运行 **Find and replace**，或按下你配置的快捷键；面板已打开时再次按下即可关闭。
3. 在空白的 **查找** 输入框中输入想查找的内容。
4. 按 `Enter` 替换当前命中项，或按 `Shift+Enter` 替换全部命中项。

### 功能特性

- **不预填、不清理** – 选中的文字不会被复制到查询框，打开后可以直接输入搜索内容。
- **选区感知的作用范围** – 选中文本时，所有查找/替换操作只作用于选区内部；没有选区时则搜索整个笔记。
- **两阶段高亮** – 在设置中选择选区颜色，命中项和当前命中项使用另一种更醒目的颜色。
- **清晰且可调整的面板** – 可在设置中调整面板字体大小，并拖动面板右下角调整尺寸。
- **实时命中计数** – 输入时立即显示 `当前/总数`，无需等待或切换窗口。
- **选项开关** – 纯文本或正则表达式，以及区分大小写开关。
- **查找历史与收藏** – 使用过的「查找 + 替换 + 开关」组合会被记录，复用方式有两种，且刻意不同：
  - **`Alt+H`（小批量）** – 选中文本，按下历史快捷键，选中一个组合，即在**选区内全部替换**，一步撤销，面板不会打开。
  - **面板中的 `🕐`（微调）** – 选中组合后回填 **查找** / **替换** 框，不做任何替换，确认后再按 `Enter` / `Shift+Enter`。
  - 每行右侧显示该组合在当前选区中的实时命中数，因此无需打开任何窗口即可放心执行。点击星标可收藏，固定在 **Favorites** 分组且永不因数量上限被淘汰。
- **键盘优先替换**：
  - `Enter` – 替换当前匹配项并跳到下一处。
  - `Shift+Enter` – 替换作用范围内的所有匹配项。
  - `↑` / `↓` – 在匹配项之间移动（不进行替换）。
  - `Tab` – 在「查找」和「替换」输入框之间切换。
  - `Esc` – 关闭面板并清除所有高亮。
  - 已配置的 **Find and replace** 快捷键在面板关闭时打开，在面板已打开时关闭。
- **完整撤销** – 每次替换都是普通的 CodeMirror 修改，因此 `Ctrl+Z` / `Ctrl+Shift+Z` 都能正常撤销。其中「全部替换」是单一步骤，可一步撤销。

### 系统要求

- Obsidian（桌面端）1.0.1 及以上。本插件仅支持桌面端，因为它依赖悬浮浮层和键盘操作流程。

### 安装

#### 从插件目录安装

1. 从最新 [release](https://github.com/SpiderK-104/search-replace-helper/releases) 下载 `main.js`、`manifest.json` 和 `styles.css`。
2. 将它们放入你的仓库目录：`<vault>/.obsidian/plugins/search-replace-helper/`。
3. 在 **设置 → 第三方插件** 中启用 **搜索替换助手**。

#### 从源码构建

```bash
npm install
npm run build
```

构建完成后会在仓库根目录生成 `main.js`、`manifest.json` 和 `styles.css`。把它们复制到 `<vault>/.obsidian/plugins/search-replace-helper/` 并重新加载 Obsidian 即可。

### 使用方法

1. 选中要修改的文字。
2. 从命令面板运行 **Find and replace**，或按下你配置的快捷键；面板已打开时再次按下即可关闭。
3. 选区会先以你选择的颜色高亮，**查找** 输入框保持为空；直接输入想查找的内容，命中项会使用另一种颜色显示。
4. 在 **替换** 输入框中输入替换文本。
5. 按 **Enter** 替换当前命中项，或按 **Shift+Enter** 全部替换；按 **Esc** 或同一快捷键关闭面板。

不需要再从查询框里删除选中的文字，因为它根本不会被复制进去。可在 **设置 → 快捷键** 中为 **Find and replace** 配置任意按键；命令会自动切换面板开关，无需手工点击。

### 设置项

| 设置项                 | 说明                                   |
| ---------------------- | -------------------------------------- |
| 默认使用正则           | 默认将查找内容解释为正则表达式。       |
| 默认区分大小写         | 默认开启大小写敏感搜索。               |
| 选区高亮颜色           | 选择搜索范围使用的高亮颜色。           |
| 面板透明度             | 调节悬浮面板的透明度。                 |
| 面板字体大小           | 调节悬浮面板的字体大小。               |
| 记住面板位置           | 在本次会话中记住并恢复面板上次的位置。 |
| 记录查找替换历史       | 记录每个查找替换组合以便复用。         |
| 保留历史条数           | 保留多少条最近记录，收藏项永不被淘汰。 |
| 历史快捷键             | 将组合应用到选区的快捷键，默认为 `Alt+H`。   |
| 清空历史               | 删除全部已保存的组合，包含收藏项。     |

### 查找历史

每条记录都会保存查找内容、替换内容以及两个开关，因为 `**` 在 `.*` 开启和关闭时是完全不同的操作。可以通过面板中的 `🕐` 按钮、历史快捷键，或 **Apply find and replace history to the selection** 命令打开。

复用方式有两种，且刻意不同：

| 入口 | 选中组合后会发生什么 |
| ---- | -------------------- |
| `Alt+H` 或该命令（需已有选区） | 在**选区内全部替换**，一步撤销，面板不打开。 |
| 面板中的 `🕐` | 仅把组合回填到 **查找** / **替换** 框，不做任何替换；确认后按 `Enter` / `Shift+Enter`。 |

在列表中：

- 右侧标记是该组合在**当前选区**中的实时命中数。命中为 0 时显示 `0`，保存的模式无法编译时显示 `invalid`。
- **Favorites** 排在最前，且不会因数量上限被删除。
- **Recently used** 按最近使用排序，数量受「保留历史条数」限制；执行一次组合即算使用过。
- 替换内容为空时显示为 *Delete*（即删除）。
- `.*` 和 `Aa` 标记表示该组合会恢复的开关状态。
- 点击星标，或按 `Mod+Shift+F`，即可收藏/取消收藏当前高亮项。

`Alt+H` 必须先有选区，且**不会退化为整篇笔记**——没有选区时只会提示你先选中文本。重复执行是安全的：第二次找不到匹配，不会改动任何内容。执行后会弹出提示告知替换了多少处，`Ctrl+Z` 可一步回退整个操作。

组合会在执行替换、全部替换或关闭面板时被记录。历史保存在当前仓库的插件数据中，会随 Obsidian Sync 同步。可通过「清空历史」删除。

### 正则表达式

点击 `.*` 按钮可启用正则搜索（JavaScript 语法）。启用后面板底部会显示 **Regex** 标记，搜索范围限制在选区时会显示 **Selection** 标记。替换文本支持捕获组：`$1`、`$2`、…、`$&`（整个匹配）以及 `$$`（字面量 `$`）。在纯文本模式下，替换文本中的 `\n`、`\t` 和 `\r` 会被转换为对应的字面字符。

在选区中，`^` 和 `$` 表示该选区的起点和终点，因此 `^##` 会匹配正好从选区开头开始的标题。模式中的空格仍然有效：`^一、` 可以匹配，但 `^一、 ` 只在 `、` 后面确实有空格时才匹配。

找不到结果时，面板会直接说明原因：模式首尾是否有空格、是否忘记打开 `.*`、或者正则是否无效。

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
