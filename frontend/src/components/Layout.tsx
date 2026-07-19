import type { ReactNode } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import Logo from './ui/Logo'

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

function Header() {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-stone-900">
          <Logo />
          Lost &amp; Found <span className="text-amber-600">Pet Matcher</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium">
          <NavItem to="/browse">Browse</NavItem>
          <NavItem to="/report/lost">Report Lost</NavItem>
          <NavItem to="/report/found">Report Found</NavItem>
        </nav>
      </div>
    </header>
  )
}

function NavItem({ to, children }: { to: string; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-md px-3 py-2 transition ${
          isActive ? 'bg-amber-50 text-amber-700' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
        }`
      }
    >
      {children}
    </NavLink>
  )
}

function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-white py-6 text-center text-sm text-stone-500">
      Lost &amp; Found Pet Matcher — a portfolio demo project.
    </footer>
  )
}
