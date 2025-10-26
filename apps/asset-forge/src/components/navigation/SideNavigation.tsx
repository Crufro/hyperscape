/**
 * SideNavigation - Main sidebar navigation container
 *
 * Beautiful side navigation with collapsible sections, quick access,
 * and smooth animations. Matches the current UI aesthetic.
 */

import { useCallback } from 'react'
import { Menu, X } from 'lucide-react'

import { navigationConfig } from '../../config/navigation-config'
import { useNavigationStore } from '../../stores/useNavigationStore'

import CollapseButton from './CollapseButton'
import NavigationFooter from './NavigationFooter'
import NavigationSection from './NavigationSection'
import QuickAccess from './QuickAccess'

export default function SideNavigation() {
  const collapsed = useNavigationStore(state => state.collapsed)
  const mobileMenuOpen = useNavigationStore(state => state.mobileMenuOpen)
  const setMobileMenuOpen = useNavigationStore(state => state.setMobileMenuOpen)

  const handleMobileMenuToggle = useCallback(() => {
    setMobileMenuOpen(!mobileMenuOpen)
  }, [mobileMenuOpen, setMobileMenuOpen])

  const handleOverlayClick = useCallback(() => {
    setMobileMenuOpen(false)
  }, [setMobileMenuOpen])

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={handleMobileMenuToggle}
        className="fixed top-4 left-4 z-50 lg:hidden bg-bg-secondary border border-border-primary rounded-lg p-2.5 shadow-lg text-text-primary hover:bg-bg-tertiary transition-colors"
        aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        style={{ minWidth: '44px', minHeight: '44px' }}
      >
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={handleOverlayClick}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-screen bg-bg-secondary/95 backdrop-blur-sm border-r border-border-primary z-50
          flex flex-col transition-all duration-300 ease-in-out shadow-xl
          ${collapsed ? 'w-16' : 'w-[280px]'}
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        aria-label="Main navigation"
      >
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-3 border-b border-border-primary/50 shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src="/forge.svg"
                alt="HyperForge"
                className="w-9 h-9 flex-shrink-0"
              />
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-text-primary truncate">HyperForge</h1>
                <p className="text-[10px] text-text-secondary/70 truncate">AI-Powered 3D</p>
              </div>
            </div>
          )}

          {collapsed && (
            <img
              src="/forge.svg"
              alt="HyperForge"
              className="w-9 h-9 mx-auto"
            />
          )}

          {/* Desktop Collapse Button */}
          <div className="hidden lg:block flex-shrink-0">
            <CollapseButton />
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <nav className="p-2 space-y-1">
            {/* Main Sections */}
            {navigationConfig.sections.map((section) => (
              <NavigationSection key={section.id} section={section} />
            ))}

            {/* Quick Access */}
            {navigationConfig.quickAccess.enabled && !collapsed && (
              <div className="pt-2 border-t border-border-primary/30 mt-2">
                <QuickAccess />
              </div>
            )}
          </nav>
        </div>

        {/* Footer */}
        <NavigationFooter />
      </aside>
    </>
  )
}
