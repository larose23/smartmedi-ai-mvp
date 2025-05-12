import React, { useState } from 'react';
import { FamilyHistory, FamilyMember } from '../lib/services/medicalHistory';
import { hipaaAuditLogger, PHICategory } from '../lib/security/hipaa/audit';

interface FamilyHistoryTreeProps {
  familyHistory: FamilyHistory;
  onMemberUpdate: (memberId: string, updates: Partial<FamilyMember>) => void;
  onInheritancePatternUpdate: (condition: string, pattern: string) => void;
}

export const FamilyHistoryTree: React.FC<FamilyHistoryTreeProps> = ({
  familyHistory,
  onMemberUpdate,
  onInheritancePatternUpdate
}) => {
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null);

  const handleMemberClick = async (member: FamilyMember) => {
    setSelectedMember(member);
    setSelectedCondition(null);

    await hipaaAuditLogger.logAccess(
      'system',
      'provider',
      PHICategory.PHI,
      'family_member_selection',
      { memberId: member.id },
      '127.0.0.1',
      'FamilyHistoryTree',
      true
    );
  };

  const handleConditionClick = async (condition: string) => {
    setSelectedCondition(condition);
    setSelectedMember(null);

    await hipaaAuditLogger.logAccess(
      'system',
      'provider',
      PHICategory.PHI,
      'family_condition_selection',
      { condition },
      '127.0.0.1',
      'FamilyHistoryTree',
      true
    );
  };

  const renderInheritancePattern = (pattern: string) => {
    switch (pattern) {
      case 'autosomal_dominant':
        return '🟢'; // Green circle
      case 'autosomal_recessive':
        return '🔵'; // Blue circle
      case 'x_linked':
        return '🟣'; // Purple circle
      case 'mitochondrial':
        return '🟡'; // Yellow circle
      default:
        return '⚪'; // White circle
    }
  };

  const renderFamilyTree = () => {
    return (
      <div className="family-tree">
        {familyHistory.members.map(member => (
          <div
            key={member.id}
            className={`family-member ${selectedMember?.id === member.id ? 'selected' : ''}`}
            onClick={() => handleMemberClick(member)}
          >
            <div className="member-info">
              <h4>{member.relationship}</h4>
              {member.age && <span>Age: {member.age}</span>}
              {!member.living && <span className="deceased">Deceased</span>}
            </div>
            <div className="member-conditions">
              {member.conditions.map(condition => (
                <div
                  key={condition.id}
                  className="condition-tag"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleConditionClick(condition.name);
                  }}
                >
                  {condition.name}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderInheritancePatterns = () => {
    return (
      <div className="inheritance-patterns">
        <h3>Inheritance Patterns</h3>
        {familyHistory.inheritancePatterns.map(pattern => (
          <div
            key={pattern.condition}
            className={`inheritance-pattern ${selectedCondition === pattern.condition ? 'selected' : ''}`}
            onClick={() => handleConditionClick(pattern.condition)}
          >
            <div className="pattern-header">
              <span className="pattern-icon">
                {renderInheritancePattern(pattern.pattern)}
              </span>
              <span className="condition-name">{pattern.condition}</span>
            </div>
            <div className="pattern-details">
              <span className="pattern-type">
                {pattern.pattern.replace('_', ' ').toUpperCase()}
              </span>
              <div className="affected-members">
                {pattern.affectedMembers.map(memberId => {
                  const member = familyHistory.members.find(m => m.id === memberId);
                  return member ? (
                    <span key={memberId} className="affected-member">
                      {member.relationship}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="family-history-container">
      <div className="family-history-content">
        {renderFamilyTree()}
        {renderInheritancePatterns()}
      </div>

      {selectedMember && (
        <div className="member-details">
          <h3>Member Details</h3>
          <div className="form-group">
            <label>Age:</label>
            <input
              type="number"
              value={selectedMember.age || ''}
              onChange={e =>
                onMemberUpdate(selectedMember.id, { age: parseInt(e.target.value) })
              }
            />
          </div>
          <div className="form-group">
            <label>Living Status:</label>
            <select
              value={selectedMember.living ? 'living' : 'deceased'}
              onChange={e =>
                onMemberUpdate(selectedMember.id, { living: e.target.value === 'living' })
              }
            >
              <option value="living">Living</option>
              <option value="deceased">Deceased</option>
            </select>
          </div>
          <div className="form-group">
            <label>Notes:</label>
            <textarea
              value={selectedMember.notes || ''}
              onChange={e =>
                onMemberUpdate(selectedMember.id, { notes: e.target.value })
              }
            />
          </div>
        </div>
      )}

      {selectedCondition && (
        <div className="condition-details">
          <h3>Inheritance Pattern</h3>
          <div className="form-group">
            <label>Pattern:</label>
            <select
              value={familyHistory.inheritancePatterns.find(p => p.condition === selectedCondition)?.pattern || 'unknown'}
              onChange={e => onInheritancePatternUpdate(selectedCondition, e.target.value)}
            >
              <option value="autosomal_dominant">Autosomal Dominant</option>
              <option value="autosomal_recessive">Autosomal Recessive</option>
              <option value="x_linked">X-Linked</option>
              <option value="mitochondrial">Mitochondrial</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
        </div>
      )}

      <style jsx>{`
        .family-history-container {
          display: flex;
          gap: 20px;
          padding: 20px;
        }
        .family-history-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .family-tree {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 15px;
        }
        .family-member {
          padding: 15px;
          border: 1px solid #ddd;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .family-member:hover {
          background: #f5f5f5;
        }
        .family-member.selected {
          border-color: #2196f3;
          background: #e3f2fd;
        }
        .member-info {
          margin-bottom: 10px;
        }
        .member-info h4 {
          margin: 0 0 5px 0;
        }
        .deceased {
          color: #f44336;
          font-size: 0.9em;
        }
        .member-conditions {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }
        .condition-tag {
          padding: 2px 8px;
          background: #e3f2fd;
          border-radius: 12px;
          font-size: 0.9em;
          cursor: pointer;
        }
        .condition-tag:hover {
          background: #bbdefb;
        }
        .inheritance-patterns {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .inheritance-pattern {
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          cursor: pointer;
        }
        .inheritance-pattern.selected {
          border-color: #2196f3;
          background: #e3f2fd;
        }
        .pattern-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 5px;
        }
        .pattern-icon {
          font-size: 1.2em;
        }
        .pattern-details {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .pattern-type {
          font-size: 0.9em;
          color: #666;
        }
        .affected-members {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }
        .affected-member {
          padding: 2px 8px;
          background: #f5f5f5;
          border-radius: 12px;
          font-size: 0.9em;
        }
        .member-details,
        .condition-details {
          width: 300px;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 4px;
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
      `}</style>
    </div>
  );
}; 