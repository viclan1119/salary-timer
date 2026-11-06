# 薪动

> 让每一秒的努力看得到

一个移动端网页应用（PWA）：输入薪资后，上班时「今日已赚」金额随时间一秒秒实时跳动，达到自定义每日目标时提醒你。可添加到手机桌面，像 App 一样使用。

## 功能

- **多种薪资基准**：`月薪 / 日薪 / 时薪` 三种模式自由切换。
- **薪资模块拆分**：分别输入 `到手工资、公积金、社保、奖金、其他` 等模块，自动求和。
- **实时更新**：前台每秒实时跳动；退出后靠时间戳校正，回来时金额已按实际经过时间算好。
- **打卡上班**：「开始上班 / 结束上班」记录工作会话，可跨多次会话累计。
- **目标提醒**：自定义今日收入目标，进度条实时展示，达成弹窗提醒（每天一次）。
- **统计**：今日已赚、累计已赚、历史记录（跨天自动结算）。
- **PWA**：可添加到手机桌面、离线可用。

## 技术栈

纯静态网页（单文件 `index.html` + `manifest.json` + `sw.js`），无构建、无依赖，可直接部署到 GitHub Pages。

## 本地预览

直接用浏览器打开 `index.html` 即可；或起一个本地静态服务器：

```bash
cd E:\ruanjian\work
npx serve .
# 或 python -m http.server 8000
```

## 部署到 GitHub Pages

1. 在 GitHub 新建一个仓库（**建议用新仓库，不要覆盖你已有的网站仓库**）。
2. 把本目录推送到该仓库：
   ```bash
   git init
   git add .
   git commit -m "薪动 网页版"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/<仓库名>.git
   git push -u origin main
   ```
3. 打开仓库 → **Settings → Pages**：
   - Source 选 **Deploy from a branch**
   - Branch 选 **main / (root)**
   - Save
4. 稍等 1–2 分钟，访问 `https://<你的用户名>.github.io/<仓库名>/` 即可。

> 已包含 `.nojekyll` 文件，可跳过 Jekyll 构建，直接发布静态文件。

## 添加到手机桌面

- **Android（Chrome/Edge）**：打开网页 → 右上角菜单 →「安装应用」/「添加到主屏幕」。
- **iPhone（Safari）**：打开网页 → 底部「分享」→「添加到主屏幕」→ 命名后添加。

添加后图标、名称（薪动）都会从 `manifest.json` 读取，打开即是全屏独立窗口，体验接近原生 App。

## 目录结构

```
work/
├── index.html            # 主页面（单文件，含全部样式与逻辑）
├── manifest.json         # PWA 清单（名称、图标、主题色）
├── sw.js                 # Service Worker（离线缓存）
├── .nojekyll             # 跳过 Jekyll 构建
├── icons/                # 应用图标（192/512/180）
├── scripts/gen-icon.js   # 图标生成脚本（node，可重新生成）
├── README.md
└── miniprogram/          # 早期微信小程序版本（已弃用，备份）
```

## 修改名称 / 图标

- **改名称/副标题**：`index.html` 顶部 `.nav` 里的 `薪动` 和 `让每一秒的努力看得到`；`manifest.json` 的 `name` / `description`。
- **换图标**：替换 `icons/` 下的 PNG（192、512、180），或改 `scripts/gen-icon.js` 后运行 `node scripts/gen-icon.js` 重新生成。
- **更新后缓存**：`sw.js` 里 `CACHE` 版本号 +1（如 `v2`），浏览器才会拉取新内容。

## 说明

- 金额按你填写的薪资与工作时长折算，仅供参考，不代表真实到手金额。
- 数据保存在浏览器本地（`localStorage`），清除浏览器数据或更换设备会丢失。
