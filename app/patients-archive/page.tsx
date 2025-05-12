'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'react-hot-toast'
import ArchiveFixButton from '../components/ArchiveFixButton'
import { Loader2, RefreshCw } from 'lucide-react'

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  contact: string;
  created_at: string;
  name?: string;
  last_visit_date?: string;
  appointment_count?: number;
  archived_at?: string;
  appointment_id?: string;
}

export default function PatientsArchivePage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isFixing, setIsFixing] = useState(false);
  const [isEmergencyFixing, setIsEmergencyFixing] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [isFixingSchema, setIsFixingSchema] = useState(false);
  const [isDirectSqlFixing, setIsDirectSqlFixing] = useState(false);
  const [isFallbackFixing, setIsFallbackFixing] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchPatients();
    
    // Set up real-time subscription to the patients table for auto-refresh
    const subscription = supabase
      .channel('patients-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'patients' },
        (payload) => {
          console.log('Real-time update received for patients table:', payload);
          fetchPatients(); // Refresh the list when the table changes
        }
      )
      .subscribe();
      
    // Clean up subscription when component unmounts
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = patients.filter(patient => 
        `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.contact?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredPatients(filtered);
    } else {
      setFilteredPatients(patients);
    }
  }, [searchTerm, patients]);

  useEffect(() => {
    // Check if there's a refresh parameter in the URL
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const shouldRefresh = urlParams.get('refresh') === 'true';
      const highlightPatientId = urlParams.get('patientId');
      
      if (shouldRefresh) {
        console.log('URL contains refresh parameter, fetching fresh data...');
        fetchPatients().then(() => {
          if (highlightPatientId) {
            console.log(`Highlighting patient ${highlightPatientId}`);
            // Scroll to and highlight the patient row if needed
            setTimeout(() => {
              const patientRow = document.getElementById(`patient-${highlightPatientId}`);
              if (patientRow) {
                patientRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                patientRow.classList.add('bg-blue-50');
                setTimeout(() => {
                  patientRow.classList.remove('bg-blue-50');
                  patientRow.classList.add('bg-blue-100');
                  setTimeout(() => {
                    patientRow.classList.remove('bg-blue-100');
                  }, 1500);
                }, 1000);
              }
            }, 500);
          }
        });
        
        // Remove the parameters to avoid refreshing on page refresh
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      console.log('============ FETCHING PATIENTS FOR ARCHIVE ============');
      
      // Direct simple query for all patients in the archive table
      const { data: archivedPatients, error: archiveError } = await supabase
        .from('patients')
        .select('*')
        .order('archived_at', { ascending: false });
      
      if (archiveError) {
        console.error('Error fetching patients archive:', archiveError);
        setLoading(false);
        return;
      }
      
      console.log(`Found ${archivedPatients?.length || 0} patients in archive`);
      
      if (archivedPatients && archivedPatients.length > 0) {
        const firstFew = archivedPatients.slice(0, 3);
        console.log('Sample archive data:', firstFew);
        
        // Check if archived_at timestamps exist
        const haveTimestamps = archivedPatients.some(p => p.archived_at);
        console.log('Archive data has timestamps:', haveTimestamps);
        
        // For any records with appointment_id, fetch appointment details
        const patientsWithDetails = await Promise.all(archivedPatients.map(async (patient) => {
          let appointmentDetails = null;
          
          if (patient.appointment_id) {
            const { data: apptData, error: apptError } = await supabase
              .from('appointments')
              .select('*')
              .eq('id', patient.appointment_id)
              .single();
              
            if (!apptError && apptData) {
              appointmentDetails = apptData;
            }
          }
          
          // Get appointment count
          const { count, error: countError } = await supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('patient_id', patient.id);
            
          return {
            ...patient,
            appointment_details: appointmentDetails,
            appointment_count: count || 0
          };
        }));
        
        setPatients(patientsWithDetails);
        setFilteredPatients(patientsWithDetails);
        
        console.log('Archived patients with archive timestamps:', patientsWithDetails.map(p => ({
          id: p.id,
          name: p.name,
          archived_at: p.archived_at
        })));
      } else {
        setPatients([]);
        setFilteredPatients([]);
      }
    } catch (error) {
      console.error('Error in fetchPatients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewPatient = (patientId: string) => {
    router.push(`/patients/${patientId}`);
  };

  const handleFixArchive = async () => {
    try {
      setIsFixing(true);
      toast.loading('Fixing patient archive...');
      
      const response = await fetch('/api/db-fix/patients-archive');
      const result = await response.json();
      
      if (result.success) {
        toast.dismiss();
        toast.success(`Archive fixed! ${result.transferredCount} patients transferred.`);
        fetchPatients(); // Refresh the list
      } else {
        toast.dismiss();
        toast.error(`Failed to fix archive: ${result.error}`);
      }
    } catch (error) {
      console.error('Error fixing archive:', error);
      toast.dismiss();
      toast.error('Failed to fix archive');
    } finally {
      setIsFixing(false);
    }
  };

  const handleEmergencyFix = async () => {
    try {
      setIsEmergencyFixing(true);
      toast.loading('Applying emergency archive fix...');
      
      const response = await fetch('/api/db-fix/direct-archive-transfer');
      const result = await response.json();
      
      if (result.success) {
        toast.dismiss();
        toast.success(`Emergency fix applied! ${result.transferredCount} patients transferred.`);
        fetchPatients(); // Refresh the list
      } else {
        toast.dismiss();
        toast.error(`Failed to apply emergency fix: ${result.error}`);
      }
    } catch (error) {
      console.error('Error applying emergency fix:', error);
      toast.dismiss();
      toast.error('Failed to apply emergency fix');
    } finally {
      setIsEmergencyFixing(false);
    }
  };

  const handleRunDiagnostics = async () => {
    try {
      setIsDiagnosing(true);
      toast.loading('Running database diagnostics...');
      
      const response = await fetch('/api/db-diagnostics');
      const result = await response.json();
      
      if (result.success) {
        toast.dismiss();
        toast.success('Diagnostics completed');
        setDiagnosticResults(result.diagnostic_results);
      } else {
        toast.dismiss();
        toast.error(`Diagnostics failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error running diagnostics:', error);
      toast.dismiss();
      toast.error('Failed to run diagnostics');
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleFixSchema = async () => {
    try {
      setIsFixingSchema(true);
      toast.loading('Fixing database schema...');
      
      const response = await fetch('/api/db-fix/schema');
      const result = await response.json();
      
      if (result.success) {
        toast.dismiss();
        toast.success(`Schema fix ${result.schema_fixed ? 'successful' : 'attempted'}`);
        // Run diagnostics after schema fix
        handleRunDiagnostics();
      } else {
        toast.dismiss();
        toast.error(`Schema fix failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error fixing schema:', error);
      toast.dismiss();
      toast.error('Failed to fix schema');
    } finally {
      setIsFixingSchema(false);
    }
  };

  const handleDirectSqlFix = async () => {
    try {
      setIsDirectSqlFixing(true);
      toast.loading('Applying direct SQL schema fix...');
      
      const response = await fetch('/api/db-fix/direct-sql');
      const result = await response.json();
      
      if (result.success) {
        toast.dismiss();
        toast.success(`Direct SQL fix successful: ${result.operations_count} operations`);
        // Run diagnostics after the fix
        handleRunDiagnostics();
      } else {
        toast.dismiss();
        toast.error(`Direct SQL fix completed with ${result.errors_count} errors`);
        // Still run diagnostics to see what happened
        handleRunDiagnostics();
      }
    } catch (error) {
      console.error('Error with direct SQL fix:', error);
      toast.dismiss();
      toast.error('Failed to apply direct SQL fix');
    } finally {
      setIsDirectSqlFixing(false);
    }
  };

  const handleFallbackFix = async () => {
    try {
      setIsFallbackFixing(true);
      toast.loading('Applying fallback database fix...');
      
      const response = await fetch('/api/db-fix/fallback-fix');
      const result = await response.json();
      
      if (result.success) {
        toast.dismiss();
        toast.success(`Fallback fix created fixed tables: ${result.operations_count} operations`);
        // Show a more detailed success message
        toast.success(`Use patients_fixed and appointments_fixed tables for data recovery`);
        // Run diagnostics
        handleRunDiagnostics();
      } else {
        toast.dismiss();
        toast.error(`Fallback fix completed with ${result.errors_count} errors`);
        handleRunDiagnostics();
      }
    } catch (error) {
      console.error('Error with fallback fix:', error);
      toast.dismiss();
      toast.error('Failed to apply fallback fix');
    } finally {
      setIsFallbackFixing(false);
    }
  };

  // Update the formatArchivedDate function to be more robust
  const formatArchivedDate = (dateString: string | null | undefined) => {
    if (!dateString) {
      return 'Not archived';
    }
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.error('Invalid date:', dateString);
        return 'Invalid date';
      }
      
      return date.toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      console.error('Error formatting date:', e, dateString);
      return String(dateString);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-blue-600 mb-4 md:mb-0">Patients Archive</h1>
        <div className="w-full md:w-auto flex gap-4">
          <Input
            type="text"
            placeholder="Search patients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-64"
          />
          <ArchiveFixButton />
          <Button 
            onClick={handleFixArchive}
            variant="outline"
            disabled={isFixing}
            className="flex items-center gap-2"
          >
            {isFixing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Run Legacy Fix
          </Button>
          <Button 
            onClick={handleEmergencyFix}
            variant="outline"
            disabled={isEmergencyFixing}
            className="flex items-center gap-2 bg-amber-50"
          >
            {isEmergencyFixing ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-500/20 border-t-red-500"></div>
                <span>Emergency Fixing...</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span className="text-amber-600">Emergency Fix</span>
              </>
            )}
          </Button>
          <Button 
            onClick={handleRunDiagnostics}
            variant="outline"
            disabled={isDiagnosing}
            className="flex items-center gap-2"
          >
            {isDiagnosing ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/20 border-t-primary"></div>
                <span>Diagnosing...</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
                <span>Diagnostics</span>
              </>
            )}
          </Button>
          <Button 
            onClick={handleFixSchema}
            variant="outline"
            disabled={isFixingSchema}
            className="flex items-center gap-2 bg-blue-50"
          >
            {isFixingSchema ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500/20 border-t-blue-500"></div>
                <span>Fixing Schema...</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M15 3h6v6"/><path d="m10 14 11-11"/></svg>
                <span className="text-blue-600">Fix Schema</span>
              </>
            )}
          </Button>
          <Button 
            onClick={handleDirectSqlFix}
            variant="outline"
            disabled={isDirectSqlFixing}
            className="flex items-center gap-2 bg-purple-50"
          >
            {isDirectSqlFixing ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-500/20 border-t-purple-500"></div>
                <span>Running SQL Fix...</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600"><path d="M3 6h18"></path><path d="M3 12h18"></path><path d="M3 18h18"></path></svg>
                <span className="text-purple-600">Direct SQL Fix</span>
              </>
            )}
          </Button>
          <Button 
            onClick={handleFallbackFix}
            variant="outline"
            disabled={isFallbackFixing}
            className="flex items-center gap-2 bg-green-50"
          >
            {isFallbackFixing ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-500/20 border-t-green-500"></div>
                <span>Creating Fixed Tables...</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><path d="M12 3v12"></path><path d="m8 11 4 4 4-4"></path><path d="M8 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-4"></path></svg>
                <span className="text-green-600">Fallback Fix</span>
              </>
            )}
          </Button>
          <Button onClick={() => router.push('/dashboard')} variant="outline">
            Back to Dashboard
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Debug info - will help us verify that data is being loaded correctly */}
          <div className="bg-gray-100 p-4 mb-4 rounded text-sm">
            <p>Total patients in archive: {patients.length}</p>
            <p>Patients with archived_at: {patients.filter(p => p.archived_at).length}</p>
            <p>Patients with appointment_id: {patients.filter(p => p.appointment_id).length}</p>
          </div>
          
          {filteredPatients.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <h2 className="text-xl font-semibold mb-2">No patients found</h2>
              <p className="text-gray-600">Try adjusting your search or add new patients to the system.</p>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Patient Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        DOB
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Gender
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Visit
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Visit Count
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Archived At
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Appointment
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPatients.map((patient) => (
                      <tr 
                        key={patient.id}
                        id={`patient-${patient.id}`} 
                        className="bg-white hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                        onClick={() => handleViewPatient(patient.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {patient.name || `${patient.first_name} ${patient.last_name}`}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {patient.date_of_birth}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {patient.gender}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {patient.contact}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {patient.last_visit_date 
                            ? new Date(patient.last_visit_date).toLocaleDateString() 
                            : 'Never'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {patient.appointment_count || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {patient.archived_at ? (
                            <div className="flex flex-col">
                              <span>
                                {new Date(patient.archived_at).toLocaleDateString('en-US', {
                                  month: '2-digit',
                                  day: '2-digit',
                                  year: 'numeric'
                                })}
                              </span>
                              <span className="text-xs text-gray-400">
                                {new Date(patient.archived_at).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              <span className="text-xs italic mt-1">
                                {Math.floor((Date.now() - new Date(patient.archived_at).getTime()) / (1000 * 60))} minutes ago
                              </span>
                            </div>
                          ) : (
                            'Not archived'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {patient.appointment_details ? (
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {new Date(patient.appointment_details.appointment_date).toLocaleDateString()} 
                                {' '}
                                {new Date(patient.appointment_details.appointment_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                              <span className="text-xs text-gray-400">
                                {patient.appointment_details.department || 'General'} - {patient.appointment_details.status || 'scheduled'}
                              </span>
                            </div>
                          ) : (
                            'None'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewPatient(patient.id);
                            }}
                            size="sm"
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add diagnostic results display */}
      {diagnosticResults && (
        <div className="bg-gray-100 p-4 my-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Database Diagnostic Results</h3>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-white p-3 rounded shadow">
              <h4 className="font-medium mb-1">Table Counts</h4>
              <ul className="text-sm">
                {Object.entries(diagnosticResults.counts || {}).map(([table, count]) => (
                  <li key={table} className="flex justify-between">
                    <span>{table}:</span>
                    <span className="font-medium">{String(count)}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="bg-white p-3 rounded shadow">
              <h4 className="font-medium mb-1">Archived Patients</h4>
              <p className="text-sm">
                Archived check-ins: {diagnosticResults.archived_check_ins_count || 0}
              </p>
              <p className="text-sm">
                Appointments with patients: {diagnosticResults.appointments_with_patients_count || 0}
              </p>
            </div>
            
            <div className="bg-white p-3 rounded shadow">
              <h4 className="font-medium mb-1">Schema Status</h4>
              <p className="text-sm">
                Patients table has required fields: {
                  diagnosticResults.patients_has_required_fields ? 
                  '✅ Yes' : '❌ No'
                }
              </p>
              {diagnosticResults.schema_fix_applied && (
                <p className="text-sm text-green-600">
                  Schema fix was applied
                </p>
              )}
            </div>
          </div>
          
          {diagnosticResults.issues.length > 0 && (
            <div className="bg-red-50 p-3 rounded shadow mb-4">
              <h4 className="font-medium mb-1 text-red-800">Issues Found ({diagnosticResults.issues.length})</h4>
              <ul className="text-sm text-red-700">
                {diagnosticResults.issues.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
          
          <Button onClick={() => setDiagnosticResults(null)} size="sm" variant="outline">
            Hide Diagnostics
          </Button>
        </div>
      )}
    </div>
  );
} 