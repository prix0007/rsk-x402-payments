import React from 'react';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import Account from './wallet/Account';
import WalletOptions from './wallet/WalletOptions';

function ConnectWallet() {
  const { isConnected } = useAccount();
  if (isConnected) return <Account />;
  return <WalletOptions />;
}

const Navbar: React.FC = () => {
  return (
    <nav className="bg-slate-800 text-white">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Brand */}
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold hover:text-blue-300 transition-colors">
              X402 Payments
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              to="/"
              className="hover:text-blue-300 transition-colors font-medium"
            >
              Services
            </Link>
            <Link
              to="/payments"
              className="hover:text-blue-300 transition-colors font-medium"
            >
              Payments
            </Link>
            <Link
              to="/manage"
              className="hover:text-blue-300 transition-colors font-medium"
            >
              Manage
            </Link>
            <Link
              to="/protected"
              className="hover:text-blue-300 transition-colors font-medium"
            >
              Protected
            </Link>

            {/* Wallet Connection */}
            <div className="ml-4">
              <ConnectWallet />
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button className="text-white hover:text-blue-300 transition-colors">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div className="md:hidden pb-4">
          <div className="flex flex-col space-y-4">
            <Link
              to="/"
              className="hover:text-blue-300 transition-colors font-medium"
            >
              Services
            </Link>
            <Link
              to="/payments"
              className="hover:text-blue-300 transition-colors font-medium"
            >
              Payments
            </Link>
            <Link
              to="/manage"
              className="hover:text-blue-300 transition-colors font-medium"
            >
              Manage
            </Link>
            <Link
              to="/protected"
              className="hover:text-blue-300 transition-colors font-medium"
            >
              Protected
            </Link>

            {/* Mobile Wallet Connection */}
            <div className="pt-2">
              <ConnectWallet />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;