import React from 'react';
import { Outlet } from 'react-router-dom';
import { LandingNavbar } from '../components/landing/LandingNavbar';
import { LandingFooter } from '../components/landing/LandingFooter';
import { ApiConnectionNotice } from '../components/common/ApiConnectionNotice';

export function LandingLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F3] text-[#12181A] selection:bg-[#102F24] selection:text-[#FAF8F3]">
      <ApiConnectionNotice />
      <LandingNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <LandingFooter />
    </div>
  );
}
