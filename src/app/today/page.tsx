'use client';

import React from 'react';
import { DailyLogPanel } from '@/components/dashboard/DailyLogPanel';
import { withAuth } from '@/hoc/withAuth';

const TodayPage: React.FC = () => (
 <main className="page mx-auto w-full max-w-5xl">
 <div className="page-head">
 <div className="page-eyebrow">Daily loop</div>
 <h1 className="page-title">Today</h1>
 <p className="page-lede">Check routines, record metrics, and close the day.</p>
 </div>

 <DailyLogPanel />
 </main>
);

export default withAuth(TodayPage);
