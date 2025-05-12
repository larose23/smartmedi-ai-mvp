'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { ClinicalDocumentService } from '@/lib/services/ClinicalDocumentService';
import type { ClinicalNote, NoteTemplate } from '@/lib/services/ClinicalDocumentService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ClinicalNoteEditorProps {
    encounterId: string;
    patientId: string;
    providerId: string;
    onSave?: (note: ClinicalNote) => void;
}

export default function ClinicalNoteEditor({
    encounterId,
    patientId,
    providerId,
    onSave
}: ClinicalNoteEditorProps) {
    const [templates, setTemplates] = useState<NoteTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const [note, setNote] = useState<ClinicalNote | null>(null);
    const [loading, setLoading] = useState(true);
    const [recording, setRecording] = useState(false);
    const [currentSection, setCurrentSection] = useState<string>('');
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [noteHistory, setNoteHistory] = useState<ClinicalNote[]>([]);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        loadTemplates();
    }, []);

    useEffect(() => {
        if (note?.id) {
            loadNoteHistory();
        }
    }, [note?.id]);

    const loadTemplates = async () => {
        try {
            setLoading(true);
            const data = await ClinicalDocumentService.getTemplatesBySpecialty('general');
            setTemplates(data);
        } catch (error) {
            console.error('Error loading templates:', error);
            toast({
                title: 'Error',
                description: 'Failed to load note templates',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const loadNoteHistory = async () => {
        if (!note?.id) return;

        try {
            const history = await ClinicalDocumentService.getNoteHistory(note.id);
            setNoteHistory(history);
        } catch (error) {
            console.error('Error loading note history:', error);
            toast({
                title: 'Error',
                description: 'Failed to load note history',
                variant: 'destructive'
            });
        }
    };

    const handleTemplateSelect = async (templateId: string) => {
        try {
            setLoading(true);
            setSelectedTemplate(templateId);
            
            // Generate note from template and encounter data
            const generatedNote = await ClinicalDocumentService.generateNoteFromEncounter(
                encounterId,
                templateId
            );
            setNote(generatedNote);
            setValidationErrors([]);
        } catch (error) {
            console.error('Error generating note:', error);
            toast({
                title: 'Error',
                description: 'Failed to generate note from template',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSectionChange = (sectionTitle: string, content: string) => {
        if (!note) return;

        setNote({
            ...note,
            content: {
                sections: note.content.sections.map(section =>
                    section.title === sectionTitle
                        ? { ...section, content }
                        : section
                )
            }
        });
        setValidationErrors([]);
    };

    const validateNote = () => {
        if (!note || !selectedTemplate) return;

        const template = templates.find(t => t.id === selectedTemplate);
        if (!template) return;

        const { isValid, errors } = ClinicalDocumentService.validateNote(note, template);
        setValidationErrors(errors);
        return isValid;
    };

    const handleSave = async () => {
        if (!note) return;

        if (!validateNote()) {
            toast({
                title: 'Validation Error',
                description: 'Please fill in all required sections',
                variant: 'destructive'
            });
            return;
        }

        try {
            setLoading(true);
            const savedNote = await ClinicalDocumentService.updateNote(note.id, {
                ...note,
                status: 'final'
            });
            toast({
                title: 'Success',
                description: 'Note saved successfully'
            });
            onSave?.(savedNote);
        } catch (error) {
            console.error('Error saving note:', error);
            toast({
                title: 'Error',
                description: 'Failed to save note',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleAmend = async () => {
        if (!note) return;

        try {
            setLoading(true);
            const amendedNote = await ClinicalDocumentService.createNoteAmendment(note.id, {
                ...note,
                metadata: {
                    ...note.metadata,
                    amendmentReason: 'Provider amendment'
                }
            });
            setNote(amendedNote);
            toast({
                title: 'Success',
                description: 'Note amendment created successfully'
            });
        } catch (error) {
            console.error('Error creating amendment:', error);
            toast({
                title: 'Error',
                description: 'Failed to create amendment',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const startRecording = async (sectionTitle: string) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            setCurrentSection(sectionTitle);
            setRecording(true);

            mediaRecorder.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                try {
                    const transcription = await ClinicalDocumentService.convertVoiceToText(audioBlob);
                    handleSectionChange(sectionTitle, transcription);
                } catch (error) {
                    console.error('Error converting voice to text:', error);
                    toast({
                        title: 'Error',
                        description: 'Failed to convert voice to text',
                        variant: 'destructive'
                    });
                }
                setRecording(false);
            };

            mediaRecorder.start();
        } catch (error) {
            console.error('Error starting recording:', error);
            toast({
                title: 'Error',
                description: 'Failed to start voice recording',
                variant: 'destructive'
            });
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && recording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Clinical Note Editor</CardTitle>
                        <div className="space-x-2">
                            <Button
                                onClick={() => setIsPreviewMode(!isPreviewMode)}
                                variant="outline"
                            >
                                {isPreviewMode ? 'Edit Mode' : 'Preview Mode'}
                            </Button>
                            <Dialog open={showHistory} onOpenChange={setShowHistory}>
                                <DialogTrigger asChild>
                                    <Button variant="outline">View History</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Note History</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        {noteHistory.map((version) => (
                                            <div key={version.id} className="p-4 border rounded-lg">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="font-medium">Version {version.version}</span>
                                                    <span className="text-sm text-gray-500">
                                                        {new Date(version.createdAt).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    Status: {version.status}
                                                </div>
                                                {version.metadata?.amendmentReason && (
                                                    <div className="text-sm text-gray-600">
                                                        Reason: {version.metadata.amendmentReason}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {validationErrors.length > 0 && (
                            <Alert variant="destructive">
                                <AlertDescription>
                                    <ul className="list-disc pl-4">
                                        {validationErrors.map((error, index) => (
                                            <li key={index}>{error}</li>
                                        ))}
                                    </ul>
                                </AlertDescription>
                            </Alert>
                        )}

                        <div>
                            <Label htmlFor="template">Note Template</Label>
                            <Select
                                value={selectedTemplate}
                                onValueChange={handleTemplateSelect}
                                disabled={isPreviewMode}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a template" />
                                </SelectTrigger>
                                <SelectContent>
                                    {templates.map((template) => (
                                        <SelectItem key={template.id} value={template.id}>
                                            {template.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {note && (
                            <div className="space-y-4">
                                {note.content.sections.map((section) => (
                                    <div key={section.title} className="space-y-2">
                                        <Label>{section.title}</Label>
                                        <div className="flex space-x-2">
                                            <Textarea
                                                value={section.content}
                                                onChange={(e) =>
                                                    handleSectionChange(section.title, e.target.value)
                                                }
                                                className="flex-1"
                                                disabled={isPreviewMode}
                                            />
                                            {section.type === 'voice' && !isPreviewMode && (
                                                <Button
                                                    onClick={() =>
                                                        recording
                                                            ? stopRecording()
                                                            : startRecording(section.title)
                                                    }
                                                    variant={recording ? 'destructive' : 'outline'}
                                                    disabled={recording && currentSection !== section.title}
                                                >
                                                    {recording && currentSection === section.title
                                                        ? 'Stop Recording'
                                                        : 'Start Recording'}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                <div className="flex justify-end space-x-2">
                                    {note.status === 'final' && (
                                        <Button
                                            onClick={handleAmend}
                                            variant="outline"
                                            disabled={loading}
                                        >
                                            Create Amendment
                                        </Button>
                                    )}
                                    {!isPreviewMode && (
                                        <Button
                                            onClick={handleSave}
                                            disabled={loading}
                                        >
                                            Save Note
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
} 