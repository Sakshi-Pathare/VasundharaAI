import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Camera,
  Layers,
  CheckSquare,
  ShieldCheck,
  User,
  Menu,
  X,
  Flame,
  LayoutDashboard,
  LogOut,
  ChevronDown,
  LogIn,
  Compass,
  ArrowLeft,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from './Button';
import { useAuth } from '../../contexts/AuthContext';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = [
    { name: 'App Hub', path: '/app', icon: Compass },
    { name: 'Live Map', path: '/map', icon: MapPin },
    { name: 'Hotspots', path: '/hotspots', icon: Flame },
    { name: 'Cleanups', path: '/cleanups', icon: CheckSquare },
    { name: 'My Reports', path: '/my-reports', icon: Layers },
    { name: 'Command Center', path: '/admin', icon: ShieldCheck },
  ];

  const isActive = (path) => {
    if (path === '/app' && location.pathname === '/app') return true;
    if (path !== '/app' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const handleSignOut = async () => {
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 transition-all font-sans">
      {/* Sleek, Single-Tier Modern Application Header */}
      <div className="bg-[#092421]/95 backdrop-blur-md border-b border-[#1B4A45]/80 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18">
            {/* Brand Logo & Back to Website Link */}
            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              <Link to="/app" className="flex items-center gap-2.5 group">
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

              {/* Discreet Return Link to Public Landing Page */}
              <Link
                to="/"
                className="hidden xl:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium text-white/60 hover:text-[#74D7CB] hover:bg-white/5 transition-all ml-1"
                title="Return to Public Landing Page"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Landing Page</span>
              </Link>
            </div>

            {/* Desktop Operational Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.path);
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={clsx(
                      'px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 flex items-center gap-1.5',
                      active
                        ? 'bg-[#163D35] text-[#74D7CB] border border-[#74D7CB]/50 font-bold shadow-xs'
                        : 'text-white/80 hover:text-white hover:bg-white/5'
                    )}
                  >
                    <Icon className={clsx('w-3.5 h-3.5', active ? 'text-[#74D7CB]' : 'text-white/60')} />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right Actions: Report Litter CTA & User Profile Dropdown */}
            <div className="hidden sm:flex items-center gap-3">
              <Link to="/report">
                <Button
                  variant="primary"
                  size="sm"
                  icon={Camera}
                  className="bg-[#74D7CB] hover:bg-[#89E3D6] text-[#092421] font-black rounded-full px-4 py-2 text-xs font-mono shadow-md hover:shadow-lg transition-all"
                >
                  Report Litter
                </Button>
              </Link>

              {user ? (
                /* Authenticated User Avatar & Dropdown */
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full bg-[#102D27] hover:bg-[#163D35] border border-[#23584E] transition-all duration-150 text-left cursor-pointer"
                    aria-label="User account menu"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#74D7CB] text-[#092421] flex items-center justify-center font-black text-xs shrink-0">
                      {getInitials(user.name)}
                    </div>
                    <div className="text-left hidden md:block">
                      <div className="text-xs font-bold text-white truncate max-w-[100px]">
                        {user.name}
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-[#74D7CB] transition-transform duration-200 ${
                        userDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#092421] border border-[#1B4A45] shadow-2xl py-2 text-xs text-white z-50 animate-fadeIn font-sans">
                      <div className="px-4 py-3 border-b border-[#1B4A45] space-y-1">
                        <div className="font-bold text-sm text-white">{user.name}</div>
                        <div className="text-[11px] text-white/70 truncate font-mono">{user.email}</div>
                        <div className="pt-1 flex items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#1B4A45] text-[#74D7CB] border border-[#74D7CB]/40">
                            {user.roleLabel || user.role}
                          </span>
                        </div>
                      </div>

                      <div className="py-1">
                        <Link
                          to={user.role === 'citizen' ? '/dashboard' : '/admin'}
                          onClick={() => setUserDropdownOpen(false)}
                          className="px-4 py-2 hover:bg-white/5 flex items-center gap-2.5 text-white/90 hover:text-[#74D7CB] font-semibold transition-colors"
                        >
                          <LayoutDashboard className="w-3.5 h-3.5 text-[#74D7CB]" />
                          <span>{user.role === 'citizen' ? 'My Dashboard' : 'Command Center'}</span>
                        </Link>
                        <Link
                          to="/my-reports"
                          onClick={() => setUserDropdownOpen(false)}
                          className="px-4 py-2 hover:bg-white/5 flex items-center gap-2.5 text-white/90 hover:text-[#74D7CB] font-semibold transition-colors"
                        >
                          <Layers className="w-3.5 h-3.5 text-[#74D7CB]" />
                          <span>My Incident Reports</span>
                        </Link>
                        <Link
                          to="/"
                          onClick={() => setUserDropdownOpen(false)}
                          className="px-4 py-2 hover:bg-white/5 flex items-center gap-2.5 text-white/90 hover:text-[#74D7CB] font-semibold transition-colors"
                        >
                          <ArrowLeft className="w-3.5 h-3.5 text-[#74D7CB]" />
                          <span>Public Landing Page</span>
                        </Link>
                      </div>

                      <div className="pt-1 border-t border-[#1B4A45]">
                        <button
                          onClick={handleSignOut}
                          className="w-full text-left px-4 py-2 hover:bg-rose-950/60 text-rose-300 hover:text-rose-200 font-bold flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5 text-rose-400" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/login">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={LogIn}
                    className="text-[#74D7CB] hover:text-white hover:bg-white/10 rounded-full font-bold px-3.5 py-1.5 text-xs font-mono"
                  >
                    Sign In
                  </Button>
                </Link>
              )}
            </div>

            {/* Mobile Actions: Report Button & Toggle */}
            <div className="flex lg:hidden items-center gap-2">
              <Link to="/report">
                <Button variant="primary" size="xs" icon={Camera} className="bg-[#74D7CB] text-[#092421] font-black">
                  Report
                </Button>
              </Link>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-white hover:bg-white/10 transition-colors border border-[#1B4A45]"
                aria-label="Toggle navigation"
              >
                {mobileMenuOpen ? <X className="w-5 h-5 text-[#74D7CB]" /> : <Menu className="w-5 h-5 text-white" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[#1B4A45] bg-[#092421]/98 backdrop-blur-xl px-4 pt-3 pb-6 space-y-2 animate-fadeIn font-sans">
            <div className="space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.path);
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={clsx(
                      'px-3.5 py-2 rounded-xl text-sm font-semibold flex items-center justify-between transition-colors',
                      active
                        ? 'bg-[#163D35] text-[#74D7CB] border border-[#74D7CB]/40'
                        : 'text-white hover:text-[#74D7CB] hover:bg-white/5'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-[#74D7CB]" />
                      <span>{link.name}</span>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="pt-3 border-t border-[#1B4A45] flex items-center gap-2">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 py-2 px-3 rounded-xl bg-[#102D27] text-white hover:text-[#74D7CB] text-xs font-semibold text-center border border-[#23584E]"
              >
                ← Landing Page
              </Link>
              {user ? (
                <button
                  onClick={handleSignOut}
                  className="flex-1 py-2 px-3 rounded-xl bg-rose-950/60 text-rose-300 text-xs font-semibold text-center border border-rose-900"
                >
                  Sign Out
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#74D7CB] text-[#092421] text-xs font-bold text-center font-mono"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
