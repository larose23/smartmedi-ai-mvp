'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { ClinicalDocumentService } from '@/lib/services/ClinicalDocumentService';
import type { NoteTemplate } from '@/lib/services/ClinicalDocumentService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface NoteTemplateManagerProps {
    onTemplateUpdate?: () => void;
}

export default function NoteTemplateManager({ onTemplateUpdate }: NoteTemplateManagerProps) {
    const [templates, setTemplates] = useState<NoteTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<NoteTemplate | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');
    const { toast } = useToast();

    useEffect(() => {
        loadTemplates();
    }, []);

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

    const handleTemplateSelect = (templateId: string) => {
        const template = templates.find(t => t.id === templateId);
        setSelectedTemplate(template || null);
        setEditing(false);
    };

    const handleCreateTemplate = () => {
        setSelectedTemplate({
            id: '',
            name: '',
            specialty: 'general',
            sections: [],
            metadata: {}
        });
        setEditing(true);
    };

    const handleDuplicateTemplate = async () => {
        if (!selectedTemplate?.id || !newTemplateName) return;

        try {
            setLoading(true);
            const duplicatedTemplate = await ClinicalDocumentService.duplicateTemplate(
                selectedTemplate.id,
                newTemplateName
            );
            toast({
                title: 'Success',
                description: 'Template duplicated successfully'
            });
            setShowDuplicateDialog(false);
            setNewTemplateName('');
            loadTemplates();
            onTemplateUpdate?.();
        } catch (error) {
            console.error('Error duplicating template:', error);
            toast({
                title: 'Error',
                description: 'Failed to duplicate template',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleExportTemplate = async () => {
        if (!selectedTemplate?.id) return;

        try {
            const templateJson = await ClinicalDocumentService.exportTemplate(selectedTemplate.id);
            const blob = new Blob([templateJson], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${selectedTemplate.name}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting template:', error);
            toast({
                title: 'Error',
                description: 'Failed to export template',
                variant: 'destructive'
            });
        }
    };

    const handleImportTemplate = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const templateJson = e.target?.result as string;
                    await ClinicalDocumentService.importTemplate(templateJson);
                    toast({
                        title: 'Success',
                        description: 'Template imported successfully'
                    });
                    loadTemplates();
                    onTemplateUpdate?.();
                } catch (error) {
                    console.error('Error importing template:', error);
                    toast({
                        title: 'Error',
                        description: 'Failed to import template',
                        variant: 'destructive'
                    });
                }
            };
            reader.readAsText(file);
        } catch (error) {
            console.error('Error reading file:', error);
            toast({
                title: 'Error',
                description: 'Failed to read template file',
                variant: 'destructive'
            });
        }
    };

    const handleAddSection = () => {
        if (!selectedTemplate) return;

        setSelectedTemplate({
            ...selectedTemplate,
            sections: [
                ...selectedTemplate.sections,
                {
                    title: '',
                    type: 'text',
                    content: '',
                    required: false
                }
            ]
        });
    };

    const handleSectionChange = (index: number, field: string, value: string | boolean) => {
        if (!selectedTemplate) return;

        const updatedSections = [...selectedTemplate.sections];
        updatedSections[index] = {
            ...updatedSections[index],
            [field]: value
        };

        setSelectedTemplate({
            ...selectedTemplate,
            sections: updatedSections
        });
    };

    const handleRemoveSection = (index: number) => {
        if (!selectedTemplate) return;

        const updatedSections = selectedTemplate.sections.filter((_, i) => i !== index);
        setSelectedTemplate({
            ...selectedTemplate,
            sections: updatedSections
        });
    };

    const handleSave = async () => {
        if (!selectedTemplate) return;

        try {
            setLoading(true);
            if (selectedTemplate.id) {
                await ClinicalDocumentService.updateTemplate(selectedTemplate.id, selectedTemplate);
            } else {
                await ClinicalDocumentService.createTemplate(selectedTemplate);
            }
            toast({
                title: 'Success',
                description: 'Template saved successfully'
            });
            setEditing(false);
            loadTemplates();
            onTemplateUpdate?.();
        } catch (error) {
            console.error('Error saving template:', error);
            toast({
                title: 'Error',
                description: 'Failed to save template',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedTemplate?.id) return;

        try {
            setLoading(true);
            await ClinicalDocumentService.deleteTemplate(selectedTemplate.id);
            toast({
                title: 'Success',
                description: 'Template deleted successfully'
            });
            setSelectedTemplate(null);
            loadTemplates();
            onTemplateUpdate?.();
        } catch (error) {
            console.error('Error deleting template:', error);
            toast({
                title: 'Error',
                description: 'Failed to delete template',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Note Template Manager</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <Select
                                value={selectedTemplate?.id || ''}
                                onValueChange={handleTemplateSelect}
                            >
                                <SelectTrigger className="w-[300px]">
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
                            <div className="space-x-2">
                                <Button
                                    onClick={handleCreateTemplate}
                                    variant="outline"
                                >
                                    New Template
                                </Button>
                                {selectedTemplate && (
                                    <>
                                        <Button
                                            onClick={() => setEditing(!editing)}
                                            variant="outline"
                                        >
                                            {editing ? 'Cancel' : 'Edit'}
                                        </Button>
                                        {!editing && (
                                            <>
                                                <Button
                                                    onClick={() => setShowDuplicateDialog(true)}
                                                    variant="outline"
                                                >
                                                    Duplicate
                                                </Button>
                                                <Button
                                                    onClick={handleExportTemplate}
                                                    variant="outline"
                                                >
                                                    Export
                                                </Button>
                                                <Button
                                                    onClick={handleDelete}
                                                    variant="destructive"
                                                >
                                                    Delete
                                                </Button>
                                            </>
                                        )}
                                    </>
                                )}
                                <div className="inline-block">
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={handleImportTemplate}
                                        className="hidden"
                                        id="import-template"
                                    />
                                    <Button
                                        onClick={() => document.getElementById('import-template')?.click()}
                                        variant="outline"
                                    >
                                        Import
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {selectedTemplate && editing && (
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="name">Template Name</Label>
                                    <Input
                                        id="name"
                                        value={selectedTemplate.name}
                                        onChange={(e) =>
                                            setSelectedTemplate({
                                                ...selectedTemplate,
                                                name: e.target.value
                                            })
                                        }
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="specialty">Specialty</Label>
                                    <Select
                                        value={selectedTemplate.specialty}
                                        onValueChange={(value) =>
                                            setSelectedTemplate({
                                                ...selectedTemplate,
                                                specialty: value
                                            })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="general">General</SelectItem>
                                            <SelectItem value="cardiology">Cardiology</SelectItem>
                                            <SelectItem value="neurology">Neurology</SelectItem>
                                            <SelectItem value="pediatrics">Pediatrics</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label>Sections</Label>
                                        <Button
                                            onClick={handleAddSection}
                                            variant="outline"
                                            size="sm"
                                        >
                                            Add Section
                                        </Button>
                                    </div>

                                    {selectedTemplate.sections.map((section, index) => (
                                        <div key={index} className="space-y-2 p-4 border rounded-lg">
                                            <div className="flex justify-between items-center">
                                                <Label>Section {index + 1}</Label>
                                                <Button
                                                    onClick={() => handleRemoveSection(index)}
                                                    variant="ghost"
                                                    size="sm"
                                                >
                                                    Remove
                                                </Button>
                                            </div>
                                            <Input
                                                placeholder="Section Title"
                                                value={section.title}
                                                onChange={(e) =>
                                                    handleSectionChange(index, 'title', e.target.value)
                                                }
                                            />
                                            <Select
                                                value={section.type}
                                                onValueChange={(value) =>
                                                    handleSectionChange(index, 'type', value)
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="text">Text</SelectItem>
                                                    <SelectItem value="voice">Voice</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    id={`required-${index}`}
                                                    checked={section.required}
                                                    onChange={(e) =>
                                                        handleSectionChange(index, 'required', e.target.checked)
                                                    }
                                                />
                                                <Label htmlFor={`required-${index}`}>Required</Label>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-end space-x-2">
                                    <Button
                                        onClick={handleSave}
                                        disabled={loading}
                                    >
                                        Save Template
                                    </Button>
                                </div>
                            </div>
                        )}

                        <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Duplicate Template</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="new-name">New Template Name</Label>
                                        <Input
                                            id="new-name"
                                            value={newTemplateName}
                                            onChange={(e) => setNewTemplateName(e.target.value)}
                                            placeholder="Enter new template name"
                                        />
                                    </div>
                                    <div className="flex justify-end space-x-2">
                                        <Button
                                            onClick={() => setShowDuplicateDialog(false)}
                                            variant="outline"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleDuplicateTemplate}
                                            disabled={!newTemplateName}
                                        >
                                            Duplicate
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
} 