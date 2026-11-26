import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  Compass,
  LogIn,
  MapPin,
  Camera,
  ArrowRight,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../../contexts/AuthContext';

export function LandingNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Overview', hashId: 'overview' },
    { name: 'Four Pillars', hashId: 'capabilities' },
    { name: 'Stakeholders', hashId: 'audience' },
  ];

  const handleNavClick = (hashId, e) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    if (location.pathname !== '/') {
      navigate(`/#${hashId}`);
    } else {
      const element = document.getElementById(hashId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header className="sticky top-0 z-50 transition-all font-sans">
      {/* Sleek, Single-Tier Modern Landing Navigation Bar */}
      <div
        className={clsx(
          'transition-all duration-300 border-b',
          isScrolled
            ? 'bg-[#092421]/95 backdrop-blur-md border-[#1B4A45]/80 shadow-lg shadow-black/10'
            : 'bg-[#092421] border-[#1B4A45]/60 shadow-md'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18">
            {/* Brand Logo & Title */}
            <Link to="/" className="flex items-center gap-3 group shrink-0">
              <img
                src="/images/vasundhara-ai-logo.webp"
                alt="Vasundhara AI"
                className="h-9 sm:h-10 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
              />
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-xl sm:text-2xl text-white tracking-tight">
                  Vasundhara
                </span>
                <span className="text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#1B4A45] text-[#74D7CB] border border-[#74D7CB]/40 uppercase">
                  AI
                </span>
              </div>
            </Link>

            {/* Desktop Center Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 lg:gap-2">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={`#${link.hashId}`}
                  onClick={(e) => handleNavClick(link.hashId, e)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-white/80 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                >
                  {link.name}
                </a>
              ))}

              <div className="h-4 w-[1px] bg-[#23584E] mx-1 hidden lg:block" />

              <Link
                to="/map"
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#74D7CB] hover:text-white hover:bg-white/5 transition-all flex items-center gap-1.5"
              >
                <MapPin className="w-3.5 h-3.5 text-[#74D7CB]" />
                <span>Live Map</span>
              </Link>

              <Link
                to="/report"
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#74D7CB] hover:text-white hover:bg-white/5 transition-all flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5 text-[#74D7CB]" />
                <span>Report Waste</span>
              </Link>
            </nav>

            {/* Desktop Right Actions: Sign In & Launch Platform */}
            <div className="hidden sm:flex items-center gap-2.5">
              <Link
                to="/login"
                className="px-4 py-2 rounded-full text-xs font-bold text-white/90 hover:text-white hover:bg-white/5 transition-all flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5 text-[#74D7CB]" />
                <span>{user ? 'My Account' : 'Sign In'}</span>
              </Link>

              <Link
                to="/app"
                className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-full bg-[#74D7CB] hover:bg-[#89E3D6] text-[#092421] text-xs font-black tracking-wide font-mono transition-all shadow-md hover:shadow-lg hover:scale-102 active:scale-98"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Launch App</span>
                <ArrowRight className="w-3 h-3 ml-0.5" />
              </Link>
            </div>

            {/* Mobile Actions & Menu Toggle */}
            <div className="flex md:hidden items-center gap-2">
              <Link
                to="/app"
                className="px-3 py-1.5 rounded-full bg-[#74D7CB] text-[#092421] text-xs font-black font-mono"
              >
                App →
              </Link>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-white hover:bg-white/10 transition-colors border border-[#1B4A45]"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5 text-[#74D7CB]" /> : <Menu className="w-5 h-5 text-white" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#1B4A45] bg-[#092421]/98 backdrop-blur-xl px-4 pt-3 pb-6 space-y-2 animate-fadeIn font-sans">
            <div className="space-y-1 py-1">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={`#${link.hashId}`}
                  onClick={(e) => handleNavClick(link.hashId, e)}
                  className="block px-3.5 py-2 rounded-xl text-sm font-semibold text-white/90 hover:text-white hover:bg-white/5 transition-colors"
                >
                  {link.name}
                </a>
              ))}

              <Link
                to="/map"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold text-[#74D7CB] hover:bg-white/5 transition-colors"
              >
                <MapPin className="w-4 h-4" />
                <span>Live Pollution Map</span>
              </Link>

              <Link
                to="/report"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold text-[#74D7CB] hover:bg-white/5 transition-colors"
              >
                <Camera className="w-4 h-4" />
                <span>Report Waste Incident</span>
              </Link>
            </div>

            <div className="pt-3 border-t border-[#1B4A45] flex items-center gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#102D27] text-white hover:text-[#74D7CB] text-xs font-bold text-center border border-[#23584E]"
              >
                {user ? 'My Account' : 'Sign In'}
              </Link>
              <Link
                to="/app"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#74D7CB] text-[#092421] text-xs font-black text-center font-mono"
              >
                Launch App →
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
