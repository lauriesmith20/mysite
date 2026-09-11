import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import BeerBetsMenuPage from './pages/BeerBetsMenuPage'
import BeerBetsPage from './pages/BeerBetsPage'
import ComingSoonPage from './pages/ComingSoonPage'
import GameScoresFriendPage from './pages/GameScoresFriendPage'
import GameScoresPage from './pages/GameScoresPage'
import H2HGamePage from './pages/H2HGamePage'
import HomePage from './pages/HomePage'
import PlantQuizGamePage from './pages/PlantQuizGamePage'
import PlantQuizLeaderboardsPage from './pages/PlantQuizLeaderboardsPage'
import PlantQuizMenuPage from './pages/PlantQuizMenuPage'
import ProfilePage from './pages/ProfilePage'
import RecipePage from './pages/RecipePage'
import RecipesPage from './pages/RecipesPage'
import SettingsPage from './pages/SettingsPage'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/game-scores" element={<GameScoresPage />} />
        <Route path="/game-scores/:friendId" element={<GameScoresFriendPage />} />
        <Route path="/h2h-game/:id" element={<H2HGamePage />} />
        <Route path="/plant-quiz" element={<PlantQuizMenuPage />} />
        <Route path="/plant-quiz/leaderboards" element={<PlantQuizLeaderboardsPage />} />
        <Route path="/plant-quiz/:mode" element={<PlantQuizGamePage />} />
        <Route path="/recipes" element={<RecipesPage />} />
        <Route path="/recipes/:id" element={<RecipePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/beer-bets" element={<BeerBetsMenuPage />} />
        <Route path="/beer-bets/:friendId" element={<BeerBetsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<ComingSoonPage />} />
      </Route>
    </Routes>
  )
}

export default App
