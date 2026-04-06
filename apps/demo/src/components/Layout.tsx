import { type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAgent } from '@domos/react';
import { useCart } from '../data/cart';
import { useWishlist } from '../data/wishlist';

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { isConnected } = useAgent();
  const { itemCount } = useCart();
  const { count: wishlistCount } = useWishlist();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-domos-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">D</span>
              </div>
              <span className="font-bold text-xl text-gray-900">DomOS</span>
              <span className="text-xs bg-domos-100 text-domos-700 px-2 py-0.5 rounded-full font-medium">
                Demo
              </span>
            </Link>

            {/* Nav */}
            <nav className="flex items-center gap-6">
              <Link
                to="/"
                className={`text-sm font-medium transition-colors ${
                  location.pathname === '/'
                    ? 'text-domos-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Catalogue
              </Link>

              <Link
                to="/cart"
                className={`text-sm font-medium transition-colors relative ${
                  location.pathname === '/cart'
                    ? 'text-domos-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Panier
                {itemCount > 0 && (
                  <span className="absolute -top-2 -right-4 bg-domos-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Link>

              <Link
                to="/wishlist"
                className={`text-sm font-medium transition-colors relative ${
                  location.pathname === '/wishlist'
                    ? 'text-domos-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Favoris
                {wishlistCount > 0 && (
                  <span className="absolute -top-2 -right-4 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              <Link
                to="/plugins"
                className={`text-sm font-medium transition-colors ${
                  location.pathname === '/plugins'
                    ? 'text-domos-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Plugins
              </Link>

              {location.pathname === '/checkout' || location.pathname.startsWith('/confirmation') ? (
                <Link
                  to="/checkout"
                  className="text-sm font-medium text-domos-600"
                >
                  Commande
                </Link>
              ) : null}

              {/* Status agent */}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-green-500' : 'bg-red-400'
                  }`}
                />
                {isConnected ? 'Agent connecte' : 'Deconnecte'}
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm">
          <p>DomOS Framework Demo - UI Agentique pour E-commerce</p>
          <p className="mt-1 text-gray-500">
            useAgentTool + Shadow Context + HITL Security
          </p>
        </div>
      </footer>
    </div>
  );
}
