# FluentAI Design System

> 设计规范文档。AI 工具读取此文件以保持视觉一致性。人类开发者改动设计时须先更新此文件。

---

## Color Tokens

| Token | Value | Usage |
|---|---|---|
| `canvas` | `#0a0f1e` | 最深背景（全局页面背景） |
| `surface-1` | `#111827` | 卡片、输入框、面板背景 |
| `surface-2` | `#1f2937` | 分割线、标签背景、进度条轨道 |
| `surface-3` | `#060b17` | Sidebar、底部输入栏背景 |
| `border` | `#1a2540` | Sidebar 分隔线 |
| `border-soft` | `#1f2937` | 卡片边框 |
| `ink` | `#f9fafb` | 主要文本、标题 |
| `ink-secondary` | `#e5e7eb` | 消息气泡文本 |
| `ink-muted` | `#9ca3af` | 次要文本、描述 |
| `ink-dim` | `#6b7280` | 占位符、时间戳 |
| `ink-faint` | `#4b5563` | 最淡提示文本 |
| `accent` | `#f59e0b` | 主操作色（按钮、高亮、激活状态） |
| `accent-hover` | `rgba(245,158,11,0.1)` | 激活背景叠加 |
| `accent-text` | `#fcd34d` | 强调词汇文本、单词高亮 |
| `accent-muted` | `#fbbf24` | 次级强调 |
| `luna` | `linear-gradient(135deg, #4f46e5, #7c3aed)` | Luna AI 头像渐变 |
| `user-avatar` | `linear-gradient(135deg, #f59e0b, #ef4444)` | 用户头像渐变 |
| `user-profile` | `linear-gradient(135deg, #6366f1, #8b5cf6)` | Sidebar 用户头像渐变 |
| `success` | `#10b981` | 掌握状态、在线指示器 |
| `warning` | `#f59e0b` | 学习中状态（同 accent） |
| `danger` | `#ef4444` | 录音停止按钮、错误提示 |
| `danger-text` | `#f87171` | 语法错误文本 |
| `correction-bg` | `rgba(239,68,68,0.06)` | 语法纠错卡片背景 |
| `word-bg` | `rgba(245,158,11,0.18)` | 词汇高亮背景 |

---

## Typography

| Role | Font | Size | Weight | Line Height | Notes |
|---|---|---|---|---|---|
| Display | system-ui / Inter | 24px | 800 (extrabold) | tight | 页面主标题 |
| Heading | system-ui / Inter | 20-21px | 800 | tight | 二级标题 |
| Sub-heading | system-ui / Inter | 15-17px | 700 | normal | 卡片标题 |
| Body | system-ui / Inter | 14px | 400 | relaxed | 正文内容 |
| Caption | system-ui / Inter | 11-12px | 500-600 | normal | 标签、时间戳 |
| Label | system-ui / Inter | 10-11px | 700 | — | uppercase + tracking-widest |
| Word | system-ui / Inter | 13.5-17px | 800 | — | 单词卡主体 |

---

## Icons

**图标库：Phosphor Icons (`@phosphor-icons/react`)**  
整个项目只使用此一套图标库，禁止混入其他图标或内联 SVG。

| 尺寸 | 使用场景 |
|---|---|
| `size={14}` | 卡片内操作图标、删除按钮、纠错图标 |
| `size={16}` | 导航图标、输入框图标、次级按钮图标 |
| `size={18}` | Logo 内图标、Sidebar logo |
| `size={20}` | 页面头部图标、主 CTA 图标 |

**Weight 使用规则：**
- `weight="regular"` → 导航、信息展示、默认状态
- `weight="bold"` → 强调操作、CTA 按钮内图标
- `weight="fill"` → 激活状态、选中状态、实心停止按钮

**图标映射参考：**

| 用途 | Phosphor 图标名 |
|---|---|
| 麦克风 | `Microphone` |
| 主页 | `House` |
| 词书 | `BookOpen` |
| 搜索 | `MagnifyingGlass` |
| 退出登录 | `SignOut` |
| 右箭头 | `ArrowRight` |
| 删除/关闭 | `X` |
| 键盘 | `Keyboard` |
| 时钟 | `Clock` |
| 书签 | `BookmarkSimple` |
| 警告圆圈 | `WarningCircle` |
| 停止录音 | `Stop` |
| 加载中 | `CircleNotch` (+ className="animate-spin") |

---

## Spacing

基础单位：`4px`

| Token | Value | 典型使用 |
|---|---|---|
| xs | 4px | 图标与文字间距 |
| sm | 8px | 同组元素间距 |
| md | 12-16px | 卡片内边距 |
| lg | 24px | 卡片间距 |
| xl | 32-40px | 页面区块间距 |
| 2xl | 40-48px | 页面顶部内边距 |

---

## Border Radius

| 场景 | 值 |
|---|---|
| 页面卡片、面板 | `16px` (rounded-2xl) |
| 普通卡片 | `12px` (rounded-xl) |
| 按钮、徽章 | `10-14px` |
| 消息气泡 | `14px`，发送方右下角 `3px` |
| 头像 | 正方形用 `9-10px`，圆形用 `9999px` |

---

## Avatar / Identity

**Luna AI 头像：**
- 形状：`rounded-[9px]` 正方形
- 背景：`linear-gradient(135deg, #4f46e5, #7c3aed)`
- 内容：白色字母 **"L"**，字重 `font-black`，无图标

**用户头像：**
- 形状：`rounded-full`
- 背景：`linear-gradient(135deg, #6366f1, #8b5cf6)`
- 内容：用户名首字母大写

---

## Page Transitions

使用 `framer-motion` AnimatePresence，所有页面统一参数：

```tsx
initial={{ opacity: 0, y: 6 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: -4 }}
transition={{ duration: 0.18, ease: 'easeOut' }}
```

---

## Layout

- Sidebar 固定宽度：`220px`
- 页面主内容区域左侧内边距：`px-10`（40px）
- Practice 页右侧单词面板：`240px`
- 移动端：暂不支持（纯桌面 Web 应用）
