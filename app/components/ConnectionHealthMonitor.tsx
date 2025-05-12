'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { HIEService } from '@/lib/services/HIEService';
import type { HIEConnection } from '@/lib/services/HIEService';

interface ConnectionHealth {
    id: string;
    name: string;
    status: string;
    lastSync: string;
    errorCount: number;
    latency: number;
}

export default function ConnectionHealthMonitor() {
    const [connections, setConnections] = useState<HIEConnection[]>([]);
    const [healthData, setHealthData] = useState<ConnectionHealth[]>([]);
    const [loading, setLoading] = useState(true);
    const [monitoring, setMonitoring] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        loadConnections();
    }, []);

    const loadConnections = async () => {
        try {
            setLoading(true);
            const data = await HIEService.getConnections();
            setConnections(data);
        } catch (error) {
            console.error('Error loading connections:', error);
            toast({
                title: 'Error',
                description: 'Failed to load connections',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const startMonitoring = async () => {
        setMonitoring(true);
        while (monitoring) {
            await checkHealth();
            await new Promise(resolve => setTimeout(resolve, 60000)); // Check every minute
        }
    };

    const stopMonitoring = () => {
        setMonitoring(false);
    };

    const checkHealth = async () => {
        try {
            const healthResults = await Promise.all(
                connections.map(async (connection) => {
                    const health = await HIEService.monitorConnectionHealth(connection.id);
                    return {
                        id: connection.id,
                        name: connection.name,
                        ...health
                    };
                })
            );
            setHealthData(healthResults);
        } catch (error) {
            console.error('Error checking health:', error);
            toast({
                title: 'Error',
                description: 'Failed to check connection health',
                variant: 'destructive'
            });
        }
    };

    const testConnection = async (id: string) => {
        try {
            const result = await HIEService.testConnection(id);
            toast({
                title: result.status ? 'Success' : 'Error',
                description: result.message,
                variant: result.status ? 'default' : 'destructive'
            });
            await checkHealth();
        } catch (error) {
            console.error('Error testing connection:', error);
            toast({
                title: 'Error',
                description: 'Failed to test connection',
                variant: 'destructive'
            });
        }
    };

    return (
        <div className="container mx-auto py-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Connection Health Monitor</CardTitle>
                    <div className="space-x-2">
                        <Button
                            onClick={monitoring ? stopMonitoring : startMonitoring}
                            variant={monitoring ? 'destructive' : 'default'}
                        >
                            {monitoring ? 'Stop Monitoring' : 'Start Monitoring'}
                        </Button>
                        <Button onClick={checkHealth} variant="outline">
                            Check Now
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div>Loading connections...</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Connection</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Last Sync</TableHead>
                                    <TableHead>Error Count</TableHead>
                                    <TableHead>Latency</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {healthData.map((health) => (
                                    <TableRow key={health.id}>
                                        <TableCell>{health.name}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    health.status === 'healthy'
                                                        ? 'success'
                                                        : 'destructive'
                                                }
                                            >
                                                {health.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(health.lastSync).toLocaleString()}
                                        </TableCell>
                                        <TableCell>{health.errorCount}</TableCell>
                                        <TableCell>{health.latency}ms</TableCell>
                                        <TableCell>
                                            <Button
                                                onClick={() => testConnection(health.id)}
                                                variant="outline"
                                                size="sm"
                                            >
                                                Test
                                            </Button>
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