# Knowledge Graph

一个交互式 3D 知识图谱可视化应用，以球面形式展示技术技能间的关联关系，支持悬停预览、详情查看和分类筛选。

![Knowledge Graph Preview](https://img.shields.io/badge/React-18-blue?logo=react)
![Three.js](https://img.shields.io/badge/Three.js-0.171-black?logo=three.js)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)

## 在线预览

[Live Demo](https://your-demo-link.vercel.app) （部署后更新链接）

## 功能特性

- 🌐 **3D 球面布局** — 技能节点按类别分布在球面上，直观展示技术生态
- 🔍 **交互探索** — 悬停高亮关联，点击查看详情，支持分类筛选
- ✨ **视觉效果** — 星空背景、脉冲光晕、流畅动画过渡
- 📊 **性能监控** — 实时显示 FPS、内存和 GPU 渲染时间

## 技术栈

- **React 18** — UI 框架
- **Three.js** — 3D 图形渲染
- **Vite** — 构建工具

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/yourusername/knowledge-graph.git
cd knowledge-graph

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 打开浏览器访问 http://localhost:5173
```

## 构建部署

```bash
# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

构建产物位于 `dist/` 目录，可部署到 Vercel、Netlify、GitHub Pages 等静态托管平台。

## 使用指南

| 操作 | 说明 |
|------|------|
| 🖱️ 拖拽 | 旋转视角 |
| 📜 滚轮 | 缩放视图 |
| 👆 悬停 | 预览节点标签和高亮关联 |
| 🖱️ 点击 | 查看技能详情 |
| 🔘 底部按钮 | 筛选显示不同类别 |

## 项目结构

```
├── src/
│   ├── App.jsx           # 主应用组件
│   ├── KnowledgeGraph.jsx # 3D 场景渲染
│   ├── data.js           # 技能数据定义
│   └── index.css         # 样式文件
├── index.html
└── package.json
```

## 自定义数据

编辑 `src/data.js` 文件，可轻松添加或修改：
- **技能节点** — 名称、类别、熟练度、描述
- **关联关系** — 技能间的连接
- **类别定义** — 自定义分类和配色

## 浏览器支持

- Chrome / Edge（推荐）
- Firefox
- Safari

需要支持 WebGL 2.0 以获得最佳性能。

## License

[MIT](LICENSE)
