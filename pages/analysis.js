import { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';

export default function AnalysisPage() {
  return (
    <DashboardLayout>
      <div className="container mx-auto p-4 max-w-3xl">
        <h1 className="text-3xl font-bold mb-8">Content Analysis</h1>
        <p className="text-lg mb-4">
          Analyze your YouTube video content to identify key topics, themes, and opportunities for optimization.
        </p>
        
        <div className="bg-white shadow rounded p-4 mb-8">
          <h2 className="text-xl font-bold mb-4">Recent Analyses</h2>
          <p className="text-gray-500">No recent analyses found. Start by analyzing a transcript.</p>
        </div>
      </div>
    </DashboardLayout>
  );
} 