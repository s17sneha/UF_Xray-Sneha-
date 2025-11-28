import React, { useRef, useState } from 'react';
import logo from './Imgs/logo-r.png';
import { Link, useLocation } from "react-router-dom";
import '../App.css';
export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isScanMobileOpen, setIsScanMobileOpen] = useState(false);
  const location = useLocation();
  const closeTimer = useRef(null);

  const openScan = () => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    setIsScanOpen(true);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setIsScanOpen(false), 180);
  };

  const linkBase = "relative text-gray-800 hover:text-blue-700 transition font-medium after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-full after:scale-x-0 after:bg-gradient-to-r after:from-blue-500 after:to-cyan-400 after:transition-transform after:duration-300 hover:after:scale-x-100 after:content-['']";
  const currentPath = (location && location.hash && location.hash.startsWith('#'))
    ? location.hash.slice(1)
    : location.pathname;
  const isActive = (path) => currentPath === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 text-gray-900 border-b border-gray-200 shadow-sm backdrop-blur supports-[backdrop-filter]:backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <a href="/" className="flex items-center gap-3 group">
            <img src={logo} className="h-9 w-auto transition-transform group-hover:scale-[1.03]" alt="site logo" />
          </a>

          <div className="flex items-center gap-2">
            <button
              aria-label="Toggle menu"
              className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-100"
              onClick={() => {
                if (isMenuOpen) setIsScanMobileOpen(false);
                setIsMenuOpen(!isMenuOpen);
              }}
            >
              {isMenuOpen ? '✖' : '☰'}
            </button>
          </div>

          <ul className="hidden md:flex items-center gap-6">
            <li>
              <Link className={`${linkBase} ${isActive('/') ? 'text-blue-700 after:scale-x-100' : ''}`} aria-current="page" to="/">Home</Link>
            </li>

            <li className="relative" onMouseEnter={openScan} onMouseLeave={scheduleClose}>
              <button
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-transparent hover:border-blue-200 hover:bg-blue-50 text-gray-800 font-medium transition"
                onMouseEnter={openScan}
                onClick={() => setIsScanOpen(!isScanOpen)}
              >
                Scan
                <span className="text-xs">▾</span>
              </button>
              {isScanOpen && (
                <div
                  className="absolute top-full left-0 mt-0 w-56 bg-white/95 backdrop-blur border border-gray-200 rounded-xl shadow-xl py-2"
                  onMouseEnter={openScan}
                  onMouseLeave={scheduleClose}
                >
                  <Link to="/AnalyzeFile" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-800 hover:bg-blue-50">🗂️ <span>Analyze File</span></Link>
                  <Link to="/AnalyzeURL" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-800 hover:bg-blue-50">🔗 <span>Analyze URL</span></Link>
                  <Link to="/AnalyzeLog" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-800 hover:bg-blue-50">📝 <span>Analyze Log</span></Link>
                  <div className="my-1 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
                  <Link to="/Vulnerabilities" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-800 hover:bg-blue-50">🛡️ <span>Vulnerabilities</span></Link>
                  <Link to="/HashGenerator" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-800 hover:bg-blue-50">🔐 <span>Hash Generator</span></Link>
                </div>
              )}
            </li>

            <li>
              <Link className={`${linkBase} ${isActive('/About') ? 'text-blue-700 after:scale-x-100' : ''}`} to="/About">About Us</Link>
            </li>
            <li>
              <Link className={`${linkBase} ${isActive('/Contact') ? 'text-blue-700 after:scale-x-100' : ''}`} to="/Contact">Contact</Link>
            </li>


          </ul>
        </div>

        {isMenuOpen && (
          <div className="md:hidden pt-2 pb-4 border-t border-gray-200">
            <ul className="flex flex-col gap-2">
              <li>
                <Link className="block px-2 py-2 rounded-lg hover:bg-blue-50" to="/" onClick={() => setIsMenuOpen(false)}>Home</Link>
              </li>
              <li className="mt-1">
                <button
                  className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-blue-50"
                  aria-expanded={isScanMobileOpen}
                  onClick={() => setIsScanMobileOpen((v) => !v)}
                >
                  <span className="text-sm font-medium">Scan</span>
                  <span className={`text-xs transition-transform ${isScanMobileOpen ? 'rotate-180' : ''}`}>▾</span>
                </button>
                {isScanMobileOpen && (
                  <div className="mt-1 ml-2 flex flex-col gap-1">
                    <Link
                      className="block px-2 py-2 rounded-lg hover:bg-blue-50"
                      to="/AnalyzeFile"
                      onClick={() => { setIsScanMobileOpen(false); setIsMenuOpen(false); }}
                    >
                      Analyze File
                    </Link>
                    <Link
                      className="block px-2 py-2 rounded-lg hover:bg-blue-50"
                      to="/AnalyzeURL"
                      onClick={() => { setIsScanMobileOpen(false); setIsMenuOpen(false); }}
                    >
                      Analyze URL
                    </Link>
                    <Link
                      className="block px-2 py-2 rounded-lg hover:bg-blue-50"
                      to="/AnalyzeLog"
                      onClick={() => { setIsScanMobileOpen(false); setIsMenuOpen(false); }}
                    >
                      Analyze Log
                    </Link>
                    <Link
                      className="block px-2 py-2 rounded-lg hover:bg-blue-50"
                      to="/Vulnerabilities"
                      onClick={() => { setIsScanMobileOpen(false); setIsMenuOpen(false); }}
                    >
                      Vulnerabilities
                    </Link>
                    <Link
                      className="block px-2 py-2 rounded-lg hover:bg-blue-50"
                      to="/HashGenerator"
                      onClick={() => { setIsScanMobileOpen(false); setIsMenuOpen(false); }}
                    >
                      Hash Generator
                    </Link>
                  </div>
                )}
              </li>
              <li>
                <Link className="block px-2 py-2 rounded-lg hover:bg-blue-50" to="/About" onClick={() => setIsMenuOpen(false)}>About Us</Link>
              </li>          
              <li>
                <Link className="block px-2 py-2 rounded-lg hover:bg-blue-50" to="/Contact" onClick={() => setIsMenuOpen(false)}>Contact</Link>
              </li>

            </ul>
          </div>
        )}
      </div>
    </nav>
  );
};