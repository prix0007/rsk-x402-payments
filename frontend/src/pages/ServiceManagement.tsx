import React, { useState } from 'react';
import ServiceCreateForm from '../components/ServiceCreateForm';
import ServiceUpdateForm from '../components/ServiceUpdateForm';

const ServiceManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'update'>('create');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Service Management</h1>
        <p className="text-gray-600">Create new services or update existing ones</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-8 max-w-md">
        <button
          onClick={() => setActiveTab('create')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'create'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Create Service
        </button>
        <button
          onClick={() => setActiveTab('update')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'update'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Update Service
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200">
        {activeTab === 'create' ? (
          <ServiceCreateForm />
        ) : (
          <ServiceUpdateForm />
        )}
      </div>
    </div>
  );
};

export default ServiceManagement;