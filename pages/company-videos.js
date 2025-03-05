import { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';

export default function CompanyVideosPage() {
  return (
    <DashboardLayout>
      <div className="container mx-auto p-4 max-w-3xl">
        <h1 className="text-3xl font-bold mb-8">Company Videos</h1>
        <p className="text-lg mb-4">
          Manage and optimize videos for your company's YouTube channel.
        </p>
        
        <div className="bg-white shadow rounded p-4 mb-8">
          <h2 className="text-xl font-bold mb-4">Your Company Videos</h2>
          <p className="text-gray-500">No company videos found. Add your company information to get started.</p>
        </div>
      </div>
    </DashboardLayout>
  );
} 