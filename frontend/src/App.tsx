import { useIsAuthenticated } from '@azure/msal-react'
import { lazy, Suspense, type ReactNode } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import AuthGate from './components/AuthGate'
import GuestHeader from './components/GuestHeader'
import Layout from './components/Layout'
import Sidebar from './components/Sidebar'
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
import PlantQuizGamePage from './pages/PlantQuizGamePage'
import PlantQuizLeaderboardsPage from './pages/PlantQuizLeaderboardsPage'
import PlantQuizMenuPage from './pages/PlantQuizMenuPage'
import ProfilePage from './pages/ProfilePage'
import RecipePage from './pages/RecipePage'
import RecipesPage from './pages/RecipesPage'
import SettingsPage from './pages/SettingsPage'

// Loaded on demand: pulls in the map libraries and country data.
const CountryHopperPage = lazy(() => import('./pages/CountryHopperPage'))

function SignedInRoutes() {
  return (
    <Routes>
      <Route path="/recipes/:id/cook" element={<CookingModePage />} />
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

// Public pages share the normal header: the full nav when signed in, a sign-in bar otherwise.
function PublicLayout({ children }: { children: ReactNode }) {
  const signedIn = useIsAuthenticated() || Boolean(LOCAL_USER)
  if (!signedIn) {
    return (
      <div className="min-h-screen">
        <GuestHeader />
        {children}
      </div>
    )
  }
  return (
    <AuthGate>
      <div className="min-h-screen">
        <Sidebar />
        {children}
      </div>
    </AuthGate>
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
      <Route path="/*" element={<Shell />} />
    </Routes>
  )
}

export default App
