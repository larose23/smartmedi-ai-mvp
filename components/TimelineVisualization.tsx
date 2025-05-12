import React, { useState, useEffect } from 'react';
import { TimelineService, TimelineEvent, SimilarCase } from '../lib/services/timelineService';
import { hipaaAuditLogger, PHICategory } from '../lib/security/hipaa/audit';

interface TimelineVisualizationProps {
  patientId: string;
  userId: string;
  department: string;
  role: string;
}

export const TimelineVisualization: React.FC<TimelineVisualizationProps> = ({
  patientId,
  userId,
  department,
  role
}) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [similarCases, setSimilarCases] = useState<SimilarCase[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year' | 'all'>('month');
  const [eventTypes, setEventTypes] = useState<Set<string>>(new Set(['visit', 'procedure', 'medication', 'lab', 'diagnosis', 'outcome']));
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [newEvent, setNewEvent] = useState<Partial<TimelineEvent>>({
    type: 'visit',
    title: '',
    description: '',
    timestamp: new Date(),
    tags: []
  });
  const [newTag, setNewTag] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<TimelineEvent | null>(null);

  useEffect(() => {
    loadTimelineData();
  }, [patientId, timeRange]);

  const loadTimelineData = async () => {
    try {
      setLoading(true);
      const timelineService = TimelineService.getInstance();
      const loadedEvents = await timelineService.getTimelineEvents(patientId, timeRange);
      setEvents(loadedEvents);

      if (selectedEvent) {
        const similar = await timelineService.findSimilarCases(patientId, selectedEvent.id);
        setSimilarCases(similar);
      }

      await hipaaAuditLogger.logAccess(
        userId,
        'provider',
        PHICategory.PHI,
        'timeline_access',
        { patientId, timeRange },
        '127.0.0.1',
        'TimelineVisualization',
        true
      );
    } catch (error) {
      console.error('Error loading timeline data:', error);
      await hipaaAuditLogger.logError(
        userId,
        'provider',
        PHICategory.PHI,
        'timeline_access_error',
        { error: error.message },
        '127.0.0.1',
        'TimelineVisualization'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEventSelect = async (event: TimelineEvent) => {
    setSelectedEvent(event);
    if (showComparison) {
      try {
        const timelineService = TimelineService.getInstance();
        const similar = await timelineService.findSimilarCases(patientId, event.id);
        setSimilarCases(similar);
      } catch (error) {
        console.error('Error loading similar cases:', error);
      }
    }
  };

  const getEventColor = (type: string) => {
    const colors = {
      visit: 'bg-blue-500',
      procedure: 'bg-purple-500',
      medication: 'bg-green-500',
      lab: 'bg-yellow-500',
      diagnosis: 'bg-red-500',
      outcome: 'bg-indigo-500'
    };
    return colors[type] || 'bg-gray-500';
  };

  const getOutcomeColor = (status: string) => {
    const colors = {
      positive: 'text-green-600',
      negative: 'text-red-600',
      neutral: 'text-gray-600'
    };
    return colors[status] || 'text-gray-600';
  };

  const handleAddEvent = async () => {
    try {
      const timelineService = TimelineService.getInstance();
      const event = await timelineService.addEvent(patientId, newEvent as Omit<TimelineEvent, 'id'>);
      setEvents([...events, event]);
      setShowEventForm(false);
      setNewEvent({
        type: 'visit',
        title: '',
        description: '',
        timestamp: new Date(),
        tags: []
      });
    } catch (error) {
      console.error('Error adding event:', error);
    }
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent) return;
    
    try {
      const timelineService = TimelineService.getInstance();
      const updatedEvent = await timelineService.updateEvent(
        patientId,
        editingEvent.id,
        newEvent
      );
      setEvents(events.map(e => e.id === updatedEvent.id ? updatedEvent : e));
      setShowEventForm(false);
      setEditingEvent(null);
      setNewEvent({
        type: 'visit',
        title: '',
        description: '',
        timestamp: new Date(),
        tags: []
      });
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    setNewEvent({
      ...newEvent,
      tags: [...(newEvent.tags || []), newTag.trim()]
    });
    setNewTag('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setNewEvent({
      ...newEvent,
      tags: newEvent.tags?.filter(tag => tag !== tagToRemove)
    });
  };

  const handleDeleteEvent = async () => {
    if (!eventToDelete) return;
    
    try {
      const timelineService = TimelineService.getInstance();
      await timelineService.deleteEvent(patientId, eventToDelete.id);
      setEvents(events.filter(e => e.id !== eventToDelete.id));
      setShowDeleteConfirm(false);
      setEventToDelete(null);
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const renderEventForm = () => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
          <h2 className="text-xl font-semibold mb-4">
            {editingEvent ? 'Edit Event' : 'Add New Event'}
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Event Type</label>
              <select
                value={newEvent.type}
                onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as any })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              >
                <option value="visit">Visit</option>
                <option value="procedure">Procedure</option>
                <option value="medication">Medication</option>
                <option value="lab">Lab</option>
                <option value="diagnosis">Diagnosis</option>
                <option value="outcome">Outcome</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input
                type="datetime-local"
                value={newEvent.timestamp?.toISOString().slice(0, 16)}
                onChange={(e) => setNewEvent({ ...newEvent, timestamp: new Date(e.target.value) })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Tags</label>
              <div className="flex mt-1">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="block w-full border border-gray-300 rounded-l-md shadow-sm p-2"
                  placeholder="Add a tag"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <button
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600"
                >
                  Add
                </button>
              </div>
              {newEvent.tags && newEvent.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {newEvent.tags.map(tag => (
                    <span 
                      key={tag} 
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {tag}
                      <button
                        type="button"
                        className="ml-1.5 text-blue-400 hover:text-blue-600"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {newEvent.type === 'outcome' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Outcome Status</label>
                <select
                  value={newEvent.outcome?.status || 'neutral'}
                  onChange={(e) => setNewEvent({
                    ...newEvent,
                    outcome: {
                      ...newEvent.outcome,
                      status: e.target.value as 'positive' | 'negative' | 'neutral'
                    }
                  })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                >
                  <option value="positive">Positive</option>
                  <option value="negative">Negative</option>
                  <option value="neutral">Neutral</option>
                </select>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowEventForm(false);
                  setEditingEvent(null);
                  setNewEvent({
                    type: 'visit',
                    title: '',
                    description: '',
                    timestamp: new Date(),
                    tags: []
                  });
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={editingEvent ? handleUpdateEvent : handleAddEvent}
                disabled={!newEvent.title || !newEvent.description}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {editingEvent ? 'Update' : 'Add Event'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDeleteConfirmation = () => {
    if (!eventToDelete) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h2 className="text-xl font-semibold mb-4">Delete Event</h2>
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete the event "{eventToDelete.title}"? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowDeleteConfirm(false);
                setEventToDelete(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteEvent}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderTimeline = () => {
    const filteredEvents = events.filter(event => eventTypes.has(event.type));
    
    return (
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
        
        {/* Events */}
        <div className="space-y-8">
          {filteredEvents.map((event, index) => (
            <div key={event.id} className="relative pl-12">
              {/* Event dot */}
              <div className={`absolute left-0 w-8 h-8 rounded-full ${getEventColor(event.type)} flex items-center justify-center text-white`}>
                {index + 1}
              </div>
              
              {/* Event content */}
              <div 
                className={`p-4 rounded-lg border ${
                  selectedEvent?.id === event.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div 
                    className="flex-grow cursor-pointer"
                    onClick={() => handleEventSelect(event)}
                  >
                    <h3 className="font-medium">{event.title}</h3>
                    <p className="text-sm text-gray-500">
                      {event.timestamp.toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {event.tags?.map(tag => (
                      <span 
                        key={tag}
                        className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600"
                      >
                        {tag}
                      </span>
                    ))}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingEvent(event);
                        setNewEvent(event);
                        setShowEventForm(true);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEventToDelete(event);
                        setShowDeleteConfirm(true);
                      }}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div 
                  className="mt-2 text-gray-600 cursor-pointer"
                  onClick={() => handleEventSelect(event)}
                >
                  {event.description}
                </div>
                
                {/* Outcome metrics */}
                {event.outcome && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <h4 className={`text-sm font-medium ${getOutcomeColor(event.outcome.status)}`}>
                      Outcome: {event.outcome.status}
                    </h4>
                    <div className="mt-2 grid grid-cols-2 gap-4">
                      {event.outcome.metrics.map((metric, idx) => (
                        <div key={idx} className="bg-white p-2 rounded border border-gray-200">
                          <div className="text-sm font-medium">{metric.name}</div>
                          <div className="text-lg">
                            {metric.value} {metric.unit}
                          </div>
                          <div className={`text-sm ${
                            metric.change > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {metric.change > 0 ? '+' : ''}{metric.change}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderComparison = () => {
    if (!selectedEvent) return null;

    return (
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-medium mb-4">Similar Cases</h3>
        <div className="space-y-4">
          {similarCases.map(case_ => (
            <div key={case_.id} className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-medium">Case {case_.id}</h4>
                  <p className="text-sm text-gray-500">
                    Similarity: {Math.round(case_.similarity * 100)}%
                  </p>
                </div>
                <div className="flex gap-2">
                  {case_.outcomes.map((outcome, idx) => (
                    <span 
                      key={idx}
                      className={`px-2 py-1 text-xs rounded-full ${
                        outcome.status === 'positive' 
                          ? 'bg-green-100 text-green-800'
                          : outcome.status === 'negative'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {outcome.status}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-600">{case_.outcomes[0].description}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Controls */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="year">Last Year</option>
            <option value="all">All Time</option>
          </select>
          
          <div className="flex gap-2">
            {['visit', 'procedure', 'medication', 'lab', 'diagnosis', 'outcome'].map(type => (
              <button
                key={type}
                onClick={() => {
                  const newTypes = new Set(eventTypes);
                  if (eventTypes.has(type)) {
                    newTypes.delete(type);
                  } else {
                    newTypes.add(type);
                  }
                  setEventTypes(newTypes);
                }}
                className={`px-3 py-1 rounded-md text-sm ${
                  eventTypes.has(type)
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => {
              setEditingEvent(null);
              setNewEvent({
                type: 'visit',
                title: '',
                description: '',
                timestamp: new Date(),
                tags: []
              });
              setShowEventForm(true);
            }}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
          >
            Add Event
          </button>
          <button
            onClick={() => setShowComparison(!showComparison)}
            className={`px-4 py-2 rounded-md ${
              showComparison
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {showComparison ? 'Hide Comparison' : 'Show Comparison'}
          </button>
        </div>
      </div>

      {/* Timeline */}
      {renderTimeline()}

      {/* Comparison View */}
      {showComparison && renderComparison()}

      {/* Event Form */}
      {showEventForm && renderEventForm()}

      {/* Delete Confirmation */}
      {showDeleteConfirm && renderDeleteConfirmation()}
    </div>
  );
}; 