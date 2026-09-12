import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <main className="app-shell">
      <section className="hero" aria-labelledby="page-title">
        <span className="eyebrow">React + TypeScript</span>
        <h1 id="page-title">Frontend Đồ án 4</h1>
        <p className="intro">
          Hello
          <code>src/App.tsx</code>.
        </p>

        <div className="actions">
          <button type="button" onClick={() => setCount((value) => value + 1)}>
            Đã nhấn {count} lần
          </button>
          <a href="https://react.dev" target="_blank" rel="noreferrer">
            Tài liệu React
          </a>
        </div>

        <div className="stack" aria-label="Công nghệ sử dụng">
          <span>Vite</span>
          <span>React 19</span>
          <span>TypeScript</span>
          <span>ESLint</span>
        </div>
      </section>
    </main>
  )
}

export default App
