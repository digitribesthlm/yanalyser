import { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';

export default function OptimizationPage() {
  return (
    <DashboardLayout>
      <div className="container mx-auto p-4 max-w-3xl">
        <h1 className="text-3xl font-bold mb-8">Video Optimization</h1>
        <p className="text-lg mb-4">
          Optimize your YouTube videos with AI-generated titles, descriptions, and timestamps.
        </p>
        
        <div className="bg-white shadow rounded p-4 mb-8">
          <h2 className="text-xl font-bold mb-4">Optimization Tools</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Title optimization</li>
            <li>Description generation with timestamps</li>
            <li>Tag suggestions</li>
            <li>Thumbnail ideas</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
} 