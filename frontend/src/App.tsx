import { useIsAuthenticated } from '@azure/msal-react'
import { lazy, Suspense } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import AuthGate from './shared/auth/AuthGate'
import AppLayout from './shared/layout/AppLayout'
import PublicLayout from './shared/layout/PublicLayout'
import { LOCAL_USER } from './lib/localAuth'
import BeerBetsMenuPage from './pages/BeerBetsMenuPage'
import BeerBetsPage from './pages/BeerBetsPage'
import ComingSoonPage from './pages/ComingSoonPage'
import GameScoresFriendPage from './pages/GameScoresFriendPage'
import GameScoresPage from './pages/GameScoresPage'
import H2HGamePage from './pages/H2HGamePage'
import HomePage from './pages/HomePage'
import GuestHomePage from './pages/GuestHomePage'
import CookingModePage from './pages/CookingModePage'
import DailyGameHistoryPage from './pages/DailyGameHistoryPage'
import PlantQuizGamePage from './pages/PlantQuizGamePage'
import PlantQuizLeaderboardsPage from './pages/PlantQuizLeaderboardsPage'
import PlantQuizMenuPage from './pages/PlantQuizMenuPage'
import ProfilePage from './pages/ProfilePage'
import RecipePage from './pages/RecipePage'
import RecipesPage from './pages/RecipesPage'
import SettingsPage from './pages/SettingsPage'
import ShirtGamePage from './pages/ShirtGamePage'

// Loaded on demand: pulls in the map libraries and country data.
const CountryHopperPage = lazy(() => import('./pages/CountryHopperPage'))
const CountryExplorerPage = lazy(() => import('./pages/CountryExplorerPage'))

function SignedInRoutes() {
  return (
    <Routes>
      <Route path="/recipes/:id/cook" element={<CookingModePage />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/game-scores" element={<GameScoresPage />} />
        <Route path="/game-scores/:friendId" element={<GameScoresFriendPage />} />
        <Route path="/h2h-game/:id" element={<H2HGamePage />} />
        <Route path="/games/:gameKey/history" element={<DailyGameHistoryPage />} />
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

// Signed-out visitors get the guest home page at "/"; every other route asks them to sign in.
function Shell() {
  const signedIn = useIsAuthenticated() || Boolean(LOCAL_USER)
  const { pathname } = useLocation()
  if (!signedIn && pathname === '/') return <GuestHomePage />
  return (
    <AuthGate>
      <SignedInRoutes />
    </AuthGate>
  )
}

function App() {
  return (
    <Routes>
      {/* Public: no sign-in required, so this link can be shared with anyone. */}
      <Route
        path="/country-hopper"
        element={
          <PublicLayout>
            <Suspense fallback={<div className="p-12 text-center text-(--soft)">Loading…</div>}>
              <CountryHopperPage />
            </Suspense>
          </PublicLayout>
        }
      />
      <Route
        path="/shirt-game"
        element={
          <PublicLayout>
            <ShirtGamePage />
          </PublicLayout>
        }
      />
      <Route
        path="/country-hopper/explore"
        element={
          <PublicLayout>
            <Suspense fallback={<div className="p-12 text-center text-(--soft)">Loading…</div>}>
              <CountryExplorerPage />
            </Suspense>
          </PublicLayout>
        }
      />
      <Route path="/*" element={<Shell />} />
    </Routes>
  )
}

export default App
