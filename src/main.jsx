import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { LandingFV, SamplePlansPage } from './LandingAndSamples.jsx'

// HaruCare 簡易ルーター
// hash で 3 ビューを切替：
//   ''                → ランディング（FV）
//   '#sample-plans'   → サンプル計画書公開ページ
//   '#app'            → 既存の管理アプリ（App.jsx）
// react-router を新規導入せず、最小実装でルーティング。
function getViewFromHash() {
  const h = (window.location.hash || '').replace(/^#/, '').trim().toLowerCase()
  if (h === 'sample-plans') return 'sample-plans'
  if (h === 'app') return 'app'
  return 'landing'
}

function Root() {
  const [view, setView] = useState(getViewFromHash)

  useEffect(() => {
    const onHashChange = () => setView(getViewFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // ビュー切替時にスクロール位置をリセット
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [view])

  if (view === 'app') return <App />
  if (view === 'sample-plans') return <SamplePlansPage />
  return <LandingFV />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
