import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function AppLayout() {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <Outlet />
    </div>
  )
}
