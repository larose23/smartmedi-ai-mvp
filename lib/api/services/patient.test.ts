import patientService, { Patient } from './patient';
import { apiClient } from '../client';

jest.mock('../client');

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('patientService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch check-ins and return data', async () => {
    const mockPatients: Patient[] = [
      { id: '1', full_name: 'John Doe', date_of_birth: '1990-01-01' },
      { id: '2', full_name: 'Jane Smith', date_of_birth: '1985-05-05' },
    ];
    mockApiClient.get.mockResolvedValue({ success: true, data: mockPatients });

    const response = await patientService.getCheckIns();
    expect(response.success).toBe(true);
    expect(response.data).toEqual(mockPatients);
    expect(mockApiClient.get).toHaveBeenCalledWith('/api/checkins', { params: {} });
  });

  it('should handle API errors gracefully', async () => {
    mockApiClient.get.mockResolvedValue({ success: false, data: [], error: 'API error' });
    const response = await patientService.getCheckIns();
    expect(response.success).toBe(false);
    expect(response.error).toBe('API error');
  });
}); 