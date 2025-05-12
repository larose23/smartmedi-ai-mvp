import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { GeospatialHealthTrend, GeospatialDataPoint } from '../lib/services/populationAnalyticsService';

interface GeospatialMapProps {
  trend: GeospatialHealthTrend;
  onDataPointClick?: (dataPoint: GeospatialDataPoint) => void;
}

const GeospatialMap: React.FC<GeospatialMapProps> = ({ trend, onDataPointClick }) => {
  const getColorByValue = (value: number) => {
    // Color scale from green (low) to red (high)
    const hue = ((1 - value) * 120).toString(10);
    return `hsl(${hue}, 70%, 50%)`;
  };

  const getRadiusByValue = (value: number) => {
    // Radius scale from 5 to 20 pixels
    return 5 + value * 15;
  };

  // Default center and zoom if not provided
  const center = trend.center || [39.8283, -98.5795]; // US center
  const zoom = trend.zoomLevel || 4;

  return (
    <div className="h-[500px] w-full rounded-lg overflow-hidden border border-gray-200">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {trend.data.map((point) => (
          <CircleMarker
            key={`${point.location[0]}-${point.location[1]}`}
            center={point.location}
            radius={getRadiusByValue(point.value)}
            pathOptions={{
              fillColor: getColorByValue(point.value),
              fillOpacity: 0.7,
              color: 'white',
              weight: 1,
            }}
            eventHandlers={{
              click: () => onDataPointClick?.(point),
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-gray-900">{trend.metric}</h3>
                <p className="text-sm text-gray-600">
                  Value: {point.value.toFixed(2)}
                </p>
                {point.metadata && (
                  <div className="mt-2 text-sm text-gray-600">
                    <p>Population: {point.metadata.population?.toLocaleString()}</p>
                    <p>Confidence: {point.metadata.confidence?.toFixed(2)}</p>
                  </div>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
};

export default GeospatialMap; 