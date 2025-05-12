'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { HIEService } from '@/lib/services/HIEService';
import type { HIEConnection, ConsentRecord } from '@/lib/services/HIEService';

export default function HIEManager() {
    const [connections, setConnections] = useState<HIEConnection[]>([]);
    const [consents, setConsents] = useState<ConsentRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('connections');
    const { toast } = useToast();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [connectionsData, consentsData] = await Promise.all([
                HIEService.getConnections(),
                HIEService.getConsents()
            ]);
            setConnections(connectionsData);
            setConsents(consentsData);
        } catch (error) {
            console.error('Error loading HIE data:', error);
            toast({
                title: 'Error',
                description: 'Failed to load HIE data',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleConnectionStatusChange = async (connectionId: string, newStatus: string) => {
        try {
            await HIEService.updateConnectionStatus(connectionId, newStatus);
            await loadData();
            toast({
                title: 'Success',
                description: 'Connection status updated successfully'
            });
        } catch (error) {
            console.error('Error updating connection status:', error);
            toast({
                title: 'Error',
                description: 'Failed to update connection status',
                variant: 'destructive'
            });
        }
    };

    const handleConsentStatusChange = async (consentId: string, newStatus: string) => {
        try {
            await HIEService.updateConsentStatus(consentId, newStatus);
            await loadData();
            toast({
                title: 'Success',
                description: 'Consent status updated successfully'
            });
        } catch (error) {
            console.error('Error updating consent status:', error);
            toast({
                title: 'Error',
                description: 'Failed to update consent status',
                variant: 'destructive'
            });
        }
    };

    return (
        <div className="container mx-auto py-6">
            <h1 className="text-2xl font-bold mb-6">Health Information Exchange Manager</h1>
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="connections">HIE Connections</TabsTrigger>
                    <TabsTrigger value="consents">Consent Records</TabsTrigger>
                </TabsList>

                <TabsContent value="connections">
                    <Card>
                        <CardHeader>
                            <CardTitle>HIE Connections</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div>Loading connections...</div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Last Sync</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {connections.map((connection) => (
                                            <TableRow key={connection.id}>
                                                <TableCell>{connection.name}</TableCell>
                                                <TableCell>{connection.type}</TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={
                                                            connection.status === 'active'
                                                                ? 'success'
                                                                : connection.status === 'error'
                                                                ? 'destructive'
                                                                : 'secondary'
                                                        }
                                                    >
                                                        {connection.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {connection.lastSync
                                                        ? new Date(connection.lastSync).toLocaleString()
                                                        : 'Never'}
                                                </TableCell>
                                                <TableCell>
                                                    <Select
                                                        value={connection.status}
                                                        onValueChange={(value) =>
                                                            handleConnectionStatusChange(connection.id, value)
                                                        }
                                                    >
                                                        <SelectTrigger className="w-[120px]">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="active">Active</SelectItem>
                                                            <SelectItem value="inactive">Inactive</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="consents">
                    <Card>
                        <CardHeader>
                            <CardTitle>Consent Records</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div>Loading consent records...</div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Patient</TableHead>
                                            <TableHead>Purpose</TableHead>
                                            <TableHead>Scope</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Expiry</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {consents.map((consent) => (
                                            <TableRow key={consent.id}>
                                                <TableCell>{consent.patient_id}</TableCell>
                                                <TableCell>{consent.purpose}</TableCell>
                                                <TableCell>
                                                    {consent.scope.map((s) => (
                                                        <Badge key={s} className="mr-1">
                                                            {s}
                                                        </Badge>
                                                    ))}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={
                                                            consent.status === 'active'
                                                                ? 'success'
                                                                : consent.status === 'revoked'
                                                                ? 'destructive'
                                                                : 'secondary'
                                                        }
                                                    >
                                                        {consent.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(consent.end_date).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell>
                                                    <Select
                                                        value={consent.status}
                                                        onValueChange={(value) =>
                                                            handleConsentStatusChange(consent.id, value)
                                                        }
                                                    >
                                                        <SelectTrigger className="w-[120px]">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="active">Active</SelectItem>
                                                            <SelectItem value="revoked">Revoked</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
} 