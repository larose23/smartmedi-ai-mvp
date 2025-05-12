'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { HIEService } from '@/lib/services/HIEService';
import type { AuditLog } from '@/lib/services/HIEService';

export default function AuditLogViewer() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        action: '',
        resourceType: '',
        startDate: '',
        endDate: ''
    });
    const { toast } = useToast();

    useEffect(() => {
        loadLogs();
    }, [filters]);

    const loadLogs = async () => {
        try {
            setLoading(true);
            const logsData = await HIEService.getAuditLogs(filters);
            setLogs(logsData);
        } catch (error) {
            console.error('Error loading audit logs:', error);
            toast({
                title: 'Error',
                description: 'Failed to load audit logs',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key: string, value: string) => {
        setFilters((prev) => ({
            ...prev,
            [key]: value
        }));
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'view':
                return 'info';
            case 'share':
                return 'warning';
            case 'export':
                return 'success';
            case 'consent':
                return 'secondary';
            default:
                return 'default';
        }
    };

    return (
        <div className="container mx-auto py-6">
            <h1 className="text-2xl font-bold mb-6">Audit Log Viewer</h1>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Filters</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <Label htmlFor="action">Action</Label>
                            <Select
                                value={filters.action}
                                onValueChange={(value) => handleFilterChange('action', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select action" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">All</SelectItem>
                                    <SelectItem value="view">View</SelectItem>
                                    <SelectItem value="share">Share</SelectItem>
                                    <SelectItem value="export">Export</SelectItem>
                                    <SelectItem value="consent">Consent</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="resourceType">Resource Type</Label>
                            <Select
                                value={filters.resourceType}
                                onValueChange={(value) => handleFilterChange('resourceType', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select resource type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">All</SelectItem>
                                    <SelectItem value="Patient">Patient</SelectItem>
                                    <SelectItem value="Encounter">Encounter</SelectItem>
                                    <SelectItem value="Document">Document</SelectItem>
                                    <SelectItem value="Consent">Consent</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="startDate">Start Date</Label>
                            <Input
                                type="date"
                                id="startDate"
                                value={filters.startDate}
                                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                            />
                        </div>

                        <div>
                            <Label htmlFor="endDate">End Date</Label>
                            <Input
                                type="date"
                                id="endDate"
                                value={filters.endDate}
                                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Audit Logs</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div>Loading audit logs...</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Timestamp</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead>Resource Type</TableHead>
                                    <TableHead>Patient</TableHead>
                                    <TableHead>Details</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell>
                                            {new Date(log.timestamp).toLocaleString()}
                                        </TableCell>
                                        <TableCell>{log.user_id}</TableCell>
                                        <TableCell>
                                            <Badge variant={getActionColor(log.action)}>
                                                {log.action}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{log.resource_type}</TableCell>
                                        <TableCell>{log.patient_id}</TableCell>
                                        <TableCell>
                                            {log.details && (
                                                <pre className="text-xs">
                                                    {JSON.stringify(log.details, null, 2)}
                                                </pre>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
} 