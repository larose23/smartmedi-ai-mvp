import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import { PatientSearch } from '@/components/PatientSearch';
import { SearchResult } from '@/lib/services/PatientSearchService';
import { useRouter } from 'next/navigation';

interface PatientSearchPageProps {
    params: {
        id: string;
    };
}

export default function PatientSearchPage({ params }: PatientSearchPageProps) {
    const router = useRouter();

    const handleResultSelect = (result: SearchResult) => {
        // Navigate to the appropriate page based on the result type
        switch (result.type) {
            case 'note':
                router.push(`/patients/${params.id}/notes/${result.id}`);
                break;
            case 'media':
                router.push(`/patients/${params.id}/media/${result.id}`);
                break;
            case 'encounter':
                router.push(`/patients/${params.id}/encounters/${result.id}`);
                break;
            case 'prescription':
                router.push(`/patients/${params.id}/prescriptions/${result.id}`);
                break;
            case 'lab':
                router.push(`/patients/${params.id}/labs/${result.id}`);
                break;
            default:
                console.warn('Unknown result type:', result.type);
        }
    };

    return (
        <Container maxWidth="lg">
            <Box sx={{ py: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Patient Records Search
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                    Search through all patient records, including clinical notes, media files,
                    encounters, prescriptions, and lab results.
                </Typography>
                <PatientSearch
                    patientId={params.id}
                    onResultSelect={handleResultSelect}
                />
            </Box>
        </Container>
    );
} 