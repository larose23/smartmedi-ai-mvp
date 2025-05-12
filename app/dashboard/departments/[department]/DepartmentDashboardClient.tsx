'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

interface CheckIn {
  id: string;
  full_name: string;
  date_of_birth: string;
  contact_info: string;
  primary_symptom: string;
  additional_symptoms: string;
  priority_level: 'high' | 'medium' | 'low';
  department: string;
  triage_score: number;
  created_at: string;
  staff_notes: string;
  status: string;
}

interface DepartmentDashboardClientProps {
  department: string;
}

export default function DepartmentDashboardClient({ department }: DepartmentDashboardClientProps) {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<{id: string, notes: string} | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<{id: string, status: string} | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'priority' | 'date'>('date');

  useEffect(() => {
    const fetchDepartmentCheckIns = async () => {
      try {
        const { data, error } = await supabase
          .from('check_ins')
          .select('*')
          .eq('department', department)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setCheckIns(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchDepartmentCheckIns();

    // Set up real-time subscription
    const subscription = supabase
      .channel('department-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'check_ins',
          filter: `department=eq.${department}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCheckIns((prev) => [payload.new as CheckIn, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setCheckIns((prev) =>
              prev.map((checkIn) =>
                checkIn.id === payload.new.id ? (payload.new as CheckIn) : checkIn
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setCheckIns((prev) => prev.filter((checkIn) => checkIn.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [department]);

  const handleEditNotes = async (id: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('check_ins')
        .update({ staff_notes: notes })
        .eq('id', id);

      if (error) throw error;
      setEditingNotes(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update notes');
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('check_ins')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      setUpdatingStatus(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  // Calculate department statistics
  const statistics = useMemo(() => {
    const total = checkIns.length;
    const waiting = checkIns.filter(c => c.status === 'waiting').length;
    const inProgress = checkIns.filter(c => c.status === 'in_progress').length;
    const completed = checkIns.filter(c => c.status === 'completed').length;
    const highPriority = checkIns.filter(c => c.priority_level === 'high').length;
    const mediumPriority = checkIns.filter(c => c.priority_level === 'medium').length;
    const lowPriority = checkIns.filter(c => c.priority_level === 'low').length;

    return {
      total,
      waiting,
      inProgress,
      completed,
      highPriority,
      mediumPriority,
      lowPriority
    };
  }, [checkIns]);

  // Filter and sort check-ins
  const filteredAndSortedCheckIns = useMemo(() => {
    let result = [...checkIns];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(checkIn => 
        checkIn.full_name.toLowerCase().includes(query) ||
        checkIn.primary_symptom.toLowerCase().includes(query) ||
        checkIn.status.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    if (sortBy === 'priority') {
      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      result.sort((a, b) => priorityOrder[a.priority_level] - priorityOrder[b.priority_level]);
    } else {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [checkIns, searchQuery, sortBy]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">{department} Department Dashboard</h1>
      
      {/* Statistics Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Total Patients</h3>
          <p className="text-2xl">{statistics.total}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Waiting</h3>
          <p className="text-2xl">{statistics.waiting}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold">In Progress</h3>
          <p className="text-2xl">{statistics.inProgress}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Completed</h3>
          <p className="text-2xl">{statistics.completed}</p>
        </div>
      </div>

      {/* Priority Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-red-100 p-4 rounded-lg">
          <h3 className="text-lg font-semibold">High Priority</h3>
          <p className="text-2xl">{statistics.highPriority}</p>
        </div>
        <div className="bg-yellow-100 p-4 rounded-lg">
          <h3 className="text-lg font-semibold">Medium Priority</h3>
          <p className="text-2xl">{statistics.mediumPriority}</p>
        </div>
        <div className="bg-green-100 p-4 rounded-lg">
          <h3 className="text-lg font-semibold">Low Priority</h3>
          <p className="text-2xl">{statistics.lowPriority}</p>
        </div>
      </div>

      {/* Search and Sort Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Search patients..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border rounded p-2 flex-grow"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'priority' | 'date')}
          className="border rounded p-2"
        >
          <option value="date">Sort by Date</option>
          <option value="priority">Sort by Priority</option>
        </select>
      </div>
      
      {/* Patient Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAndSortedCheckIns.map((checkIn) => (
          <div key={checkIn.id} className="border rounded-lg p-4">
            <h2 className="font-semibold">{checkIn.full_name}</h2>
            <p>Priority: {checkIn.priority_level}</p>
            <p>Status: {checkIn.status}</p>
            <p>Symptoms: {checkIn.primary_symptom}</p>
            
            <div className="mt-2">
              <button
                onClick={() => setEditingNotes({ id: checkIn.id, notes: checkIn.staff_notes })}
                className="text-blue-500 hover:text-blue-700"
              >
                Edit Notes
              </button>
            </div>

            <div className="mt-2">
              <select
                value={checkIn.status}
                onChange={(e) => handleUpdateStatus(checkIn.id, e.target.value)}
                className="border rounded p-1"
              >
                <option value="waiting">Waiting</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      {editingNotes && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Edit Notes</h3>
            <textarea
              value={editingNotes.notes}
              onChange={(e) => setEditingNotes({ ...editingNotes, notes: e.target.value })}
              className="border rounded p-2 w-full"
              rows={4}
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                onClick={() => setEditingNotes(null)}
                className="px-4 py-2 bg-gray-200 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => handleEditNotes(editingNotes.id, editingNotes.notes)}
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 