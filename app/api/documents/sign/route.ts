import { NextRequest, NextResponse } from 'next/server';
import { DocumentExportService } from '@/lib/services/DocumentExportService';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { documentId, signatureData, metadata } = body;

        if (!documentId || !signatureData) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const signature = await DocumentExportService.addElectronicSignature(
            documentId,
            session.user.id,
            signatureData,
            metadata
        );

        return NextResponse.json(signature);
    } catch (error) {
        console.error('Error adding signature:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const searchParams = req.nextUrl.searchParams;
        const signatureId = searchParams.get('id');

        if (!signatureId) {
            return NextResponse.json(
                { error: 'Missing signature ID' },
                { status: 400 }
            );
        }

        const isValid = await DocumentExportService.verifySignature(signatureId);

        return NextResponse.json({ isValid });
    } catch (error) {
        console.error('Error verifying signature:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 