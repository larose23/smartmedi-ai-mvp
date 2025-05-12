import React from 'react';
import { Provider } from '@/types/scheduling';

interface ProviderSelectorProps {
  providers: Provider[];
  selectedProviders: Provider[];
  onSelectionChange: (providers: Provider[]) => void;
}

const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  providers,
  selectedProviders,
  onSelectionChange
}) => {
  const handleProviderToggle = (provider: Provider) => {
    const isSelected = selectedProviders.some(p => p.id === provider.id);
    if (isSelected) {
      onSelectionChange(selectedProviders.filter(p => p.id !== provider.id));
    } else {
      onSelectionChange([...selectedProviders, provider]);
    }
  };

  const handleSelectAll = () => {
    onSelectionChange(providers);
  };

  const handleDeselectAll = () => {
    onSelectionChange([]);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Providers</h3>
        <div className="space-x-2">
          <button
            onClick={handleSelectAll}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Select All
          </button>
          <button
            onClick={handleDeselectAll}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Deselect All
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {providers.map(provider => (
          <div
            key={provider.id}
            className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer"
            onClick={() => handleProviderToggle(provider)}
          >
            <input
              type="checkbox"
              checked={selectedProviders.some(p => p.id === provider.id)}
              onChange={() => {}}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{provider.name}</p>
              <p className="text-xs text-gray-500">
                {provider.specialties.join(', ')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProviderSelector; 