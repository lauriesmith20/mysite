import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ComingSoonPage from './pages/ComingSoonPage'
import GameScoresPage from './pages/GameScoresPage'
import H2HGamePage from './pages/H2HGamePage'
import HomePage from './pages/HomePage'
import SettingsPage from './pages/SettingsPage'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/game-scores" element={<GameScoresPage />} />
        <Route path="/h2h-game/:id" element={<H2HGamePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<ComingSoonPage />} />
      </Route>
    </Routes>
  )
}

export default App
