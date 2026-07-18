# 🏝 学习岛 · v1（无后端 · 孩子端核心闭环）

> 基于「学习岛-激励机制设计_1.md」实现的暑期学习打卡 App，第一版为**孩子端核心闭环**，无后端，运行时数据经 AES-256-GCM 加密后写入浏览器 IndexedDB。
>
> 技术栈：Vite + React 19 + TypeScript + [animal-island-ui](https://github.com/guokaigdg/animal-island-ui)（动森风格 UI 库）+ react-router 7。

## 快速开始

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # 类型检查 + 生产构建
```

## 已实现（v1 范围）

| 页面            | 路径        | 覆盖设计文档章节                              |
| --------------- | ----------- | --------------------------------------------- |
| 首页 Dashboard  | `/`         | §五（时间银行预览）· §九（进度面板）          |
| 任务列表        | `/tasks`    | §二（积分体系）· §4.1（宽松时间锁定）· §4.4 单任务结算 · §家长审核（简化版）· §6.1（挑战通道） |
| 专注模式        | `/focus/:id`| §三（番茄钟 + 加成 + 连击）· §4.3（系统计时）· §4.4 预览结算 |
| 奖励商城        | `/shop`     | §十一（三大类商品 + 限购 + 兑换审核）         |

**未实现 / 留待后续版本**（不在 v1 范围）：
- 家长端独立 UI + 密码验证（§九 / §10）
- 听诵 + AI 检查（§十二）
- 技能成长树 + 段位（§六 · §十）
- 限时挑战卡（§七）
- 元素周期表速记页（§十二 12.1）
- 防 iPad 切换应用监测（§三）
- 动态校准 / 脚手架退场后台（§六 · §九 7）

## 目录结构（已采用 ant design pro 约定）

```
bozen/
├── data/                       # 种子 JSON（运行时通过 services 读取）
│   ├── subjects.json
│   ├── tasks.json              # 任务模板（无日期，按需生成当日实例）
│   ├── shop.json
│   ├── config.json             # §九 8 统一调参入口
│   └── README.md
├── src/
│   ├── components/             # 通用组件
│   │   ├── common/             # SubjectTag / Difficulty
│   │   └── layout/             # AppLayout（顶栏 + 导航 + Outlet）
│   ├── pages/                  # 路由级页面（Pro 约定）
│   │   ├── Home/HomePage.tsx
│   │   ├── Tasks/TasksPage.tsx
│   │   ├── Focus/FocusPage.tsx
│   │   └── Shop/ShopPage.tsx
│   ├── services/               # 数据访问层（Pro 迁移点全在这里）
│   │   ├── seed.ts             # 读取 data/*.json
│   │   ├── storage.ts          # IndexedDB + AES-256-GCM 加密存储
│   │   ├── taskService.ts      # 任务实例 CRUD
│   │   ├── timeBankService.ts  # 时间银行聚合
│   │   ├── userService.ts      # 积分钱包 + 兑换
│   │   └── settlement.ts       # 方案 A 单任务 + 时间银行结算公式
│   ├── models/                 # TS 类型（Pro 约定 src/models）
│   ├── hooks/                  # useUser / useDayTasks（useSyncExternalStore 微 store）
│   ├── utils/                  # 日期 / 格式化
│   ├── App.tsx                 # 路由表
│   ├── main.tsx                # 入口（StrictMode + Router）
│   ├── index.css               # 全局样式 + CSS 变量
│   └── vite-env.d.ts
├── vite.config.ts              # 路径别名 @ / @data
├── tsconfig.json / app / node
├── index.html
└── package.json
```

## 迁移到 ant design pro 时要做的事

> v1 已为迁移做了三项预备，按下列顺序替换即可：

1. **替换 services 内部实现**：
   - `services/storage.ts` 改为 axios/umi-request 包装
   - `services/seed.ts` 改为从后端拉取 `/api/subjects` `/api/tasks` `/api/shop` `/api/config`
   - `services/taskService.ts` / `userService.ts` / `timeBankService.ts` 的函数签名保持不变，内部改为 HTTP 调用
   - 组件、页面、models **无需改动**
2. **路由替换为 Pro 的 `config/routes.ts`**：把 `src/App.tsx` 里的 Routes 配置搬过去，每个页面文件原封不动放在 `src/pages/` 下。
3. **状态层（可选）**：当前用 `useSyncExternalStore` 实现的微 store 已经够用；如果想用 dva / umi-model，把 `src/hooks/useUser.ts` 重写为 model 即可，调用方不变。

数据模型（`src/models/`）建议直接拷贝过去，是最稳定的迁移面。

## 关键设计决策（与文档对照）

- **方案 A：价值归集**（§4.4）：单任务不再单独发提前奖励，所有节约时间归入「每日时间银行」分段倍率兑换。`settlement.ts` 的 `settleTask` 函数直接实现了 §4.4 的表格。
- **铁律：质量验收通过才进入时间结算**（§4.2）：被退回的任务 `savedMinutes = 0`，且不影响其他任务的时间池（不株连，§5.4）。
- **宽松时间开始前锁定**（§4.1）：在 `TasksPage` 的「开始」按钮里，弹 Modal 锁定后才进入 `in_progress`，进入后不可改。
- **实际用时系统计时**（§4.3）：`FocusPage` 用 setInterval 累加 `actualSeconds`，没有任何手填入口。
- **挑战通道不封顶**（§6.1）：`challenge` 类任务额外 +30% 主动性加成（默认配置，可在 `data/config.json` 调）。
- **商城不放运动**（§11.3）：踢球不是奖励，只有游戏 / 特权卡 / 足球周边（球鞋券每年限 2 双）。

## 重置数据

清空所有运行时状态：进入家长端“数据备份”，点击“一键清空”；也可在代码中调用 `storage.clearAll()`。
