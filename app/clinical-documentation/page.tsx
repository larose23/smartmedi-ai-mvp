'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ClinicalNoteEditor from '@/components/ClinicalNoteEditor';
import NoteTemplateManager from '@/components/NoteTemplateManager';
import type { ClinicalNote } from '@/lib/services/ClinicalDocumentService';

export default function ClinicalDocumentationPage() {
    const [activeTab, setActiveTab] = useState('notes');
    const [selectedEncounter, setSelectedEncounter] = useState<string | null>(null);

    const handleNoteSave = (note: ClinicalNote) => {
        // Handle note save event
        console.log('Note saved:', note);
    };

    const handleTemplateUpdate = () => {
        // Handle template update event
        console.log('Template updated');
    };

    return (
        <div className="container mx-auto py-6">
            <h1 className="text-3xl font-bold mb-6">Clinical Documentation</h1>
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="notes">Clinical Notes</TabsTrigger>
                    <TabsTrigger value="templates">Note Templates</TabsTrigger>
                </TabsList>

                <TabsContent value="notes" className="mt-6">
                    {selectedEncounter ? (
                        <ClinicalNoteEditor
                            encounterId={selectedEncounter}
                            patientId="patient-123" // Replace with actual patient ID
                            providerId="provider-123" // Replace with actual provider ID
                            onSave={handleNoteSave}
                        />
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-gray-500">Select an encounter to start documenting</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="templates" className="mt-6">
                    <NoteTemplateManager onTemplateUpdate={handleTemplateUpdate} />
                </TabsContent>
            </Tabs>
        </div>
    );
} 