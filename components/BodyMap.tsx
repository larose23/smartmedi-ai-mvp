import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { hipaaAuditLogger, PHICategory } from '../lib/security/hipaa/audit';
import { bodyRegions, BodyRegion } from '../lib/constants/bodyRegions';

interface PainPoint {
  id: string;
  regionId: string;
  subRegionId?: string;
  x: number;
  y: number;
  intensity: number;
  type: 'localized' | 'radiating';
  duration: string;
  frequency: string;
  onset: string;
  notes: string;
  timestamp: number;
  history: {
    timestamp: number;
    intensity: number;
    type: 'localized' | 'radiating';
    notes: string;
  }[];
}

interface BodyMapProps {
  onPainPointAdd: (painPoint: PainPoint) => void;
  onPainPointUpdate: (painPoint: PainPoint) => void;
  onPainPointRemove: (painPointId: string) => void;
  initialPainPoints?: PainPoint[];
}

export const BodyMap: React.FC<BodyMapProps> = ({
  onPainPointAdd,
  onPainPointUpdate,
  onPainPointRemove,
  initialPainPoints = []
}) => {
  const { user } = useAuth();
  const [selectedRegion, setSelectedRegion] = useState<BodyRegion | null>(null);
  const [selectedSubRegion, setSelectedSubRegion] = useState<BodyRegion | null>(null);
  const [painPoints, setPainPoints] = useState<PainPoint[]>(initialPainPoints);
  const [isAddingPainPoint, setIsAddingPainPoint] = useState(false);
  const [selectedPainPoint, setSelectedPainPoint] = useState<PainPoint | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const handleRegionClick = async (region: BodyRegion, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedRegion(region);
    setSelectedSubRegion(null);
    setIsAddingPainPoint(true);

    await hipaaAuditLogger.logAccess(
      user?.id || 'anonymous',
      user?.role || 'patient',
      PHICategory.PHI,
      'body_map_region_selection',
      { regionId: region.id },
      '127.0.0.1',
      'BodyMap',
      true
    );
  };

  const handleSubRegionClick = async (region: BodyRegion, subRegion: BodyRegion, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedRegion(region);
    setSelectedSubRegion(subRegion);
    setIsAddingPainPoint(true);

    await hipaaAuditLogger.logAccess(
      user?.id || 'anonymous',
      user?.role || 'patient',
      PHICategory.PHI,
      'body_map_subregion_selection',
      { regionId: region.id, subRegionId: subRegion.id },
      '127.0.0.1',
      'BodyMap',
      true
    );
  };

  const handlePainPointAdd = async (event: React.MouseEvent<SVGSVGElement>) => {
    if (!isAddingPainPoint || !selectedRegion || !svgRef.current) return;

    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse());

    const newPainPoint: PainPoint = {
      id: `pain-${Date.now()}`,
      regionId: selectedRegion.id,
      subRegionId: selectedSubRegion?.id,
      x: svgP.x,
      y: svgP.y,
      intensity: 5,
      type: 'localized',
      duration: '',
      frequency: '',
      onset: '',
      notes: '',
      timestamp: Date.now(),
      history: [{
        timestamp: Date.now(),
        intensity: 5,
        type: 'localized',
        notes: 'Initial pain point added'
      }]
    };

    setPainPoints(prev => [...prev, newPainPoint]);
    onPainPointAdd(newPainPoint);
    setIsAddingPainPoint(false);
    setSelectedRegion(null);
    setSelectedSubRegion(null);
  };

  const handlePainPointClick = (painPoint: PainPoint) => {
    setSelectedPainPoint(painPoint);
  };

  const handlePainPointUpdate = (updates: Partial<PainPoint>) => {
    if (!selectedPainPoint) return;

    const updatedPainPoint = {
      ...selectedPainPoint,
      ...updates,
      history: [
        ...selectedPainPoint.history,
        {
          timestamp: Date.now(),
          intensity: updates.intensity || selectedPainPoint.intensity,
          type: updates.type || selectedPainPoint.type,
          notes: updates.notes || selectedPainPoint.notes
        }
      ]
    };

    setPainPoints(prev =>
      prev.map(p => (p.id === selectedPainPoint.id ? updatedPainPoint : p))
    );
    onPainPointUpdate(updatedPainPoint);
  };

  const handlePainPointRemove = (painPointId: string) => {
    setPainPoints(prev => prev.filter(p => p.id !== painPointId));
    onPainPointRemove(painPointId);
    setSelectedPainPoint(null);
  };

  const renderBodyRegions = () => {
    return bodyRegions.map(region => (
      <g key={region.id}>
        <path
          d={region.path}
          fill={selectedRegion?.id === region.id ? '#e3f2fd' : 'transparent'}
          stroke="#2196f3"
          strokeWidth="1"
          onClick={(e) => handleRegionClick(region, e)}
          className="body-region"
        />
        {region.subRegions?.map(subRegion => (
          <path
            key={subRegion.id}
            d={subRegion.path}
            fill={selectedSubRegion?.id === subRegion.id ? '#bbdefb' : 'transparent'}
            stroke="#1976d2"
            strokeWidth="1"
            onClick={(e) => handleSubRegionClick(region, subRegion, e)}
            className="body-subregion"
          />
        ))}
      </g>
    ));
  };

  return (
    <div className="body-map-container">
      <div className="body-map">
        <svg
          ref={svgRef}
          viewBox="0 0 200 300"
          onClick={handlePainPointAdd}
          className="body-svg"
        >
          {renderBodyRegions()}

          {painPoints.map(painPoint => (
            <g key={painPoint.id}>
              <circle
                cx={painPoint.x}
                cy={painPoint.y}
                r={5 + painPoint.intensity}
                fill={painPoint.type === 'radiating' ? '#ff9800' : '#f44336'}
                stroke="#fff"
                strokeWidth="2"
                onClick={() => handlePainPointClick(painPoint)}
                className="pain-point"
              />
              {painPoint.type === 'radiating' && (
                <circle
                  cx={painPoint.x}
                  cy={painPoint.y}
                  r={10 + painPoint.intensity}
                  fill="none"
                  stroke="#ff9800"
                  strokeWidth="1"
                  strokeDasharray="4"
                />
              )}
            </g>
          ))}
        </svg>
      </div>

      {selectedPainPoint && (
        <div className="pain-point-details">
          <h3>Pain Point Details</h3>
          <div className="form-group">
            <label>Intensity (1-10):</label>
            <input
              type="range"
              min="1"
              max="10"
              value={selectedPainPoint.intensity}
              onChange={e =>
                handlePainPointUpdate({ intensity: parseInt(e.target.value) })
              }
            />
          </div>
          <div className="form-group">
            <label>Type:</label>
            <select
              value={selectedPainPoint.type}
              onChange={e =>
                handlePainPointUpdate({
                  type: e.target.value as 'localized' | 'radiating'
                })
              }
            >
              <option value="localized">Localized</option>
              <option value="radiating">Radiating</option>
            </select>
          </div>
          <div className="form-group">
            <label>Duration:</label>
            <input
              type="text"
              value={selectedPainPoint.duration}
              onChange={e =>
                handlePainPointUpdate({ duration: e.target.value })
              }
              placeholder="e.g., 2 hours"
            />
          </div>
          <div className="form-group">
            <label>Frequency:</label>
            <input
              type="text"
              value={selectedPainPoint.frequency}
              onChange={e =>
                handlePainPointUpdate({ frequency: e.target.value })
              }
              placeholder="e.g., daily"
            />
          </div>
          <div className="form-group">
            <label>Onset:</label>
            <input
              type="text"
              value={selectedPainPoint.onset}
              onChange={e =>
                handlePainPointUpdate({ onset: e.target.value })
              }
              placeholder="e.g., sudden"
            />
          </div>
          <div className="form-group">
            <label>Notes:</label>
            <textarea
              value={selectedPainPoint.notes}
              onChange={e =>
                handlePainPointUpdate({ notes: e.target.value })
              }
              placeholder="Additional details..."
            />
          </div>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={showHistory}
                onChange={e => setShowHistory(e.target.checked)}
              />
              Show History
            </label>
          </div>
          {showHistory && (
            <div className="pain-history">
              <h4>Pain History</h4>
              <div className="history-list">
                {selectedPainPoint.history.map((entry, index) => (
                  <div key={index} className="history-entry">
                    <div className="history-time">
                      {new Date(entry.timestamp).toLocaleString()}
                    </div>
                    <div className="history-details">
                      <span>Intensity: {entry.intensity}</span>
                      <span>Type: {entry.type}</span>
                      {entry.notes && <span>Notes: {entry.notes}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <button
            className="remove-button"
            onClick={() => handlePainPointRemove(selectedPainPoint.id)}
          >
            Remove Pain Point
          </button>
        </div>
      )}

      <style jsx>{`
        .body-map-container {
          display: flex;
          gap: 20px;
          padding: 20px;
        }
        .body-map {
          flex: 1;
          max-width: 400px;
          border: 1px solid #ddd;
          border-radius: 4px;
          overflow: hidden;
        }
        .body-svg {
          width: 100%;
          height: auto;
        }
        .body-region,
        .body-subregion {
          cursor: pointer;
          transition: fill 0.2s;
        }
        .body-region:hover {
          fill: #e3f2fd;
        }
        .body-subregion:hover {
          fill: #bbdefb;
        }
        .pain-point {
          cursor: pointer;
          transition: r 0.2s;
        }
        .pain-point:hover {
          r: 8;
        }
        .pain-point-details {
          flex: 1;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 4px;
          max-height: 600px;
          overflow-y: auto;
        }
        .form-group {
          margin-bottom: 15px;
        }
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
        }
        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }
        .form-group textarea {
          height: 80px;
          resize: vertical;
        }
        .pain-history {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
        }
        .history-list {
          max-height: 200px;
          overflow-y: auto;
        }
        .history-entry {
          padding: 10px;
          border-bottom: 1px solid #eee;
        }
        .history-time {
          font-size: 0.9em;
          color: #666;
          margin-bottom: 5px;
        }
        .history-details {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .remove-button {
          padding: 8px 16px;
          background: #f44336;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
        }
        .remove-button:hover {
          background: #d32f2f;
        }
      `}</style>
    </div>
  );
}; 