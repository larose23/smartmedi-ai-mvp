'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import HIEManager from '@/components/HIEManager';
import AuditLogViewer from '@/components/AuditLogViewer';
import ConnectionHealthMonitor from '@/components/ConnectionHealthMonitor';

export default function HIEPage() {
    return (
        <div className="container mx-auto py-6">
            <h1 className="text-3xl font-bold mb-8">Health Information Exchange</h1>
            
            <Tabs defaultValue="connections" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="connections">HIE Connections</TabsTrigger>
                    <TabsTrigger value="health">Health Monitor</TabsTrigger>
                    <TabsTrigger value="audit">Audit Logs</TabsTrigger>
                </TabsList>

                <TabsContent value="connections">
                    <HIEManager />
                </TabsContent>

                <TabsContent value="health">
                    <ConnectionHealthMonitor />
                </TabsContent>

                <TabsContent value="audit">
                    <AuditLogViewer />
                </TabsContent>
            </Tabs>
        </div>
    );
} 