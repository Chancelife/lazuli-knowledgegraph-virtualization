# Knowledge Graph

An interactive 3D knowledge graph visualization that displays technology skills and their relationships on a spherical layout, featuring hover previews, detail panels, and category filtering.

![React](https://img.shields.io/badge/React-18-blue?logo=react)
![Three.js](https://img.shields.io/badge/Three.js-0.171-black?logo=three.js)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)

## Live Demo

[View Demo](https://your-demo-link.vercel.app) *(Update link after deployment)*

## Features

- 🌐 **Spherical Layout** — Skills organized by category on an interactive 3D sphere
- 🔍 **Interactive Exploration** — Hover to highlight connections, click for details, filter by category
- ✨ **Visual Effects** — Starfield background, pulsing glow effects, smooth animations
- 📊 **Performance Monitor** — Real-time FPS, memory usage, and GPU render time

## Tech Stack

- **React 18** — UI framework
- **Three.js** — 3D graphics rendering
- **Vite** — Build tool

## Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/knowledge-graph.git
cd knowledge-graph

# Install dependencies
npm install

# Start development server
npm run dev

# Open browser at http://localhost:5173
```

## Build & Deploy

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

Static files will be generated in the `dist/` directory, ready for deployment to Vercel, Netlify, GitHub Pages, or any static hosting platform.

## Usage

| Action | Description |
|--------|-------------|
| 🖱️ Drag | Rotate the view |
| 📜 Scroll | Zoom in/out |
| 👆 Hover | Preview node label and highlight connections |
| 🖱️ Click | View skill details |
| 🔘 Bottom buttons | Filter skills by category |

## Project Structure

```
├── src/
│   ├── App.jsx              # Main application component
│   ├── KnowledgeGraph.jsx   # 3D scene rendering
│   ├── data.js              # Skill data definitions
│   └── index.css            # Stylesheet
├── index.html
└── package.json
```

## Customizing Data

Edit `src/data.js` to customize:
- **Skill Nodes** — Name, category, proficiency level, description
- **Connections** — Relationships between skills
- **Categories** — Custom categories and color schemes

## Browser Support

- Chrome / Edge (recommended)
- Firefox
- Safari

WebGL 2.0 support is recommended for optimal performance.

## License

[MIT](LICENSE)
