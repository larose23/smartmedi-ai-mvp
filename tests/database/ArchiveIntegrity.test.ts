import { createClient } from '@supabase/supabase-js';
import { ArchiveVerificationService } from '@/services/archiveVerificationService';

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      data: jest.fn().mockResolvedValue({ data: [], error: null }),
    })),
  })),
}));

describe('Archive Integrity Tests', () => {
  let archiveService: ArchiveVerificationService;
  const mockAppointments = [
    {
      id: '1',
      patient_id: 'p1',
      status: 'completed',
      department: 'Emergency',
      triage_score: 7,
      check_in_time: '2024-01-01T10:00:00',
      discharge_time: '2024-01-01T12:00:00',
    },
    {
      id: '2',
      patient_id: 'p2',
      status: 'completed',
      department: 'Urgent Care',
      triage_score: 5,
      check_in_time: '2024-01-01T11:00:00',
      discharge_time: '2024-01-01T13:00:00',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    archiveService = ArchiveVerificationService.getInstance();
  });

  it('should verify complete record transfer', async () => {
    // Mock source and archive data
    (createClient as jest.Mock).mockImplementation(() => ({
      from: jest.fn().mockImplementation((table) => ({
        select: jest.fn().mockResolvedValue({
          data: table === 'appointments' ? mockAppointments : mockAppointments,
          error: null,
        }),
      })),
    }));

    const result = await archiveService.verifyArchiveIntegrity();

    expect(result.status).toBe('success');
    expect(result.discrepancies).toHaveLength(0);
    expect(result.orphanedRecords).toHaveLength(0);
    expect(result.missingRecords).toHaveLength(0);
  });

  it('should detect missing records', async () => {
    // Mock source with more records than archive
    (createClient as jest.Mock).mockImplementation(() => ({
      from: jest.fn().mockImplementation((table) => ({
        select: jest.fn().mockResolvedValue({
          data: table === 'appointments' ? mockAppointments : [mockAppointments[0]],
          error: null,
        }),
      })),
    }));

    const result = await archiveService.verifyArchiveIntegrity();

    expect(result.status).toBe('warning');
    expect(result.missingRecords).toHaveLength(1);
    expect(result.missingRecords[0].id).toBe('2');
  });

  it('should detect orphaned records', async () => {
    // Mock archive with more records than source
    (createClient as jest.Mock).mockImplementation(() => ({
      from: jest.fn().mockImplementation((table) => ({
        select: jest.fn().mockResolvedValue({
          data: table === 'appointments' ? [mockAppointments[0]] : mockAppointments,
          error: null,
        }),
      })),
    }));

    const result = await archiveService.verifyArchiveIntegrity();

    expect(result.status).toBe('warning');
    expect(result.orphanedRecords).toHaveLength(1);
    expect(result.orphanedRecords[0].id).toBe('2');
  });

  it('should detect data mismatches', async () => {
    // Mock data with mismatched fields
    const mismatchedArchive = [
      {
        ...mockAppointments[0],
        triage_score: 8, // Different from source
      },
      mockAppointments[1],
    ];

    (createClient as jest.Mock).mockImplementation(() => ({
      from: jest.fn().mockImplementation((table) => ({
        select: jest.fn().mockResolvedValue({
          data: table === 'appointments' ? mockAppointments : mismatchedArchive,
          error: null,
        }),
      })),
    }));

    const result = await archiveService.verifyArchiveIntegrity();

    expect(result.status).toBe('warning');
    expect(result.mismatchedRecords).toHaveLength(1);
    expect(result.mismatchedRecords[0].id).toBe('1');
    expect(result.mismatchedRecords[0].field).toBe('triage_score');
  });

  it('should handle database errors gracefully', async () => {
    // Mock database error
    (createClient as jest.Mock).mockImplementation(() => ({
      from: jest.fn().mockImplementation(() => ({
        select: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Database connection failed'),
        }),
      })),
    }));

    const result = await archiveService.verifyArchiveIntegrity();

    expect(result.status).toBe('error');
    expect(result.error).toBe('Database connection failed');
  });

  it('should verify required fields presence', async () => {
    // Mock incomplete records
    const incompleteAppointments = [
      {
        id: '1',
        patient_id: 'p1',
        status: 'completed',
        // Missing required fields
      },
    ];

    (createClient as jest.Mock).mockImplementation(() => ({
      from: jest.fn().mockImplementation((table) => ({
        select: jest.fn().mockResolvedValue({
          data: table === 'appointments' ? mockAppointments : incompleteAppointments,
          error: null,
        }),
      })),
    }));

    const result = await archiveService.verifyArchiveIntegrity();

    expect(result.status).toBe('warning');
    expect(result.incompleteRecords).toHaveLength(1);
    expect(result.incompleteRecords[0].id).toBe('1');
    expect(result.incompleteRecords[0].missingFields).toContain('department');
    expect(result.incompleteRecords[0].missingFields).toContain('triage_score');
  });

  it('should verify data type consistency', async () => {
    // Mock records with incorrect data types
    const typeMismatchedArchive = [
      {
        ...mockAppointments[0],
        triage_score: '7', // String instead of number
        check_in_time: 1234567890, // Number instead of string
      },
    ];

    (createClient as jest.Mock).mockImplementation(() => ({
      from: jest.fn().mockImplementation((table) => ({
        select: jest.fn().mockResolvedValue({
          data: table === 'appointments' ? mockAppointments : typeMismatchedArchive,
          error: null,
        }),
      })),
    }));

    const result = await archiveService.verifyArchiveIntegrity();

    expect(result.status).toBe('warning');
    expect(result.typeMismatches).toHaveLength(2);
    expect(result.typeMismatches[0].field).toBe('triage_score');
    expect(result.typeMismatches[1].field).toBe('check_in_time');
  });

  it('should verify timestamp consistency', async () => {
    // Mock records with inconsistent timestamps
    const timestampMismatchedArchive = [
      {
        ...mockAppointments[0],
        check_in_time: '2024-01-01T10:00:01', // 1 second difference
      },
    ];

    (createClient as jest.Mock).mockImplementation(() => ({
      from: jest.fn().mockImplementation((table) => ({
        select: jest.fn().mockResolvedValue({
          data: table === 'appointments' ? mockAppointments : timestampMismatchedArchive,
          error: null,
        }),
      })),
    }));

    const result = await archiveService.verifyArchiveIntegrity();

    expect(result.status).toBe('warning');
    expect(result.timestampMismatches).toHaveLength(1);
    expect(result.timestampMismatches[0].id).toBe('1');
    expect(result.timestampMismatches[0].field).toBe('check_in_time');
  });

  it('should verify relationship integrity', async () => {
    // Mock records with broken relationships
    const relationshipMismatchedArchive = [
      {
        ...mockAppointments[0],
        patient_id: 'non_existent_patient',
      },
    ];

    (createClient as jest.Mock).mockImplementation(() => ({
      from: jest.fn().mockImplementation((table) => ({
        select: jest.fn().mockResolvedValue({
          data: table === 'appointments' ? mockAppointments : relationshipMismatchedArchive,
          error: null,
        }),
      })),
    }));

    const result = await archiveService.verifyArchiveIntegrity();

    expect(result.status).toBe('warning');
    expect(result.relationshipErrors).toHaveLength(1);
    expect(result.relationshipErrors[0].id).toBe('1');
    expect(result.relationshipErrors[0].field).toBe('patient_id');
  });
}); 