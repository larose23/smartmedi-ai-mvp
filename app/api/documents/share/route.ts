import { NextRequest, NextResponse } from 'next/server';
import { DocumentExportService } from '@/lib/services/DocumentExportService';
import { supabase } from '@/lib/supabase/client';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { documentId, recipientEmail, expiresInDays } = body;

        if (!documentId || !recipientEmail) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const share = await DocumentExportService.shareDocument(
            documentId,
            recipientEmail,
            expiresInDays
        );

        return NextResponse.json(share);
    } catch (error) {
        console.error('Error sharing document:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const accessToken = searchParams.get('token');

        if (!accessToken) {
            return NextResponse.json(
                { error: 'Missing access token' },
                { status: 400 }
            );
        }

        // Verify the access token
        const { data: share, error } = await supabase
            .from('document_shares')
            .select('*')
            .eq('accessToken', accessToken)
            .single();

        if (error || !share) {
            return NextResponse.json(
                { error: 'Invalid access token' },
                { status: 401 }
            );
        }

        // Check if the share has expired
        if (new Date(share.expiresAt) < new Date()) {
            // Update share status to expired
            await supabase
                .from('document_shares')
                .update({ status: 'expired' })
                .eq('id', share.id);

            return NextResponse.json(
                { error: 'Access token has expired' },
                { status: 401 }
            );
        }

        // Update share status to accessed
        await supabase
            .from('document_shares')
            .update({ status: 'accessed' })
            .eq('id', share.id);

        // Fetch the document content
        const { data: document, error: documentError } = await supabase
            .from('clinical_notes')
            .select('*')
            .eq('id', share.documentId)
            .single();

        if (documentError || !document) {
            return NextResponse.json(
                { error: 'Document not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            document,
            share: {
                id: share.id,
                expiresAt: share.expiresAt,
                status: 'accessed'
            }
        });
    } catch (error) {
        console.error('Error accessing shared document:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 