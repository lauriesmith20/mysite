import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="md:pl-16">
        <Outlet />
      </div>
    </div>
  )
}
