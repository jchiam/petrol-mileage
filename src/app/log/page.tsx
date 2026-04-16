import type { Metadata } from 'next';

import { LogForm } from './LogForm';

export const metadata: Metadata = {
  title: 'Log Fill-Up — Petrol Tracker',
};

export default function LogPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pb-safe mx-auto max-w-sm px-5 pt-6">
        <LogForm />
      </div>
    </div>
  );
}
