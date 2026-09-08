import { Route, Routes } from 'react-router-dom'
import ComingSoonPage from './pages/ComingSoonPage'
import HomePage from './pages/HomePage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="*" element={<ComingSoonPage />} />
    </Routes>
  )
}

export default App
