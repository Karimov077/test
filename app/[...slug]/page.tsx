'use client';

import dynamic from 'next/dynamic';

const App = dynamic(() => import('../../src/App'), {
  ssr: false,
  loading: () => <div style={{ padding: 24, color: '#e2e8f0' }}>Loading...</div>
});

export default function AdminRoutePage() {
  return <App />;
}
