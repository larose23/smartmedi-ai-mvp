import { NextRequest, NextResponse } from 'next/server';
import { DocumentExchangeService } from '@/lib/services/DocumentExchangeService';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            sourceSystem,
            targetSystem,
            documentType,
            documentId,
            content,
            metadata
        } = body;

        if (!sourceSystem || !targetSystem || !documentType || !documentId || !content) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const document = await DocumentExchangeService.createDocumentExchange(
            sourceSystem,
            targetSystem,
            documentType,
            documentId,
            content,
            metadata
        );

        return NextResponse.json(document);
    } catch (error) {
        console.error('Error creating document exchange:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const id = searchParams.get('id');
        const query = searchParams.get('query') || '';
        const sourceSystem = searchParams.get('sourceSystem');
        const targetSystem = searchParams.get('targetSystem');
        const documentType = searchParams.get('documentType');
        const status = searchParams.get('status');

        if (id) {
            const document = await DocumentExchangeService.getDocumentExchange(id);
            return NextResponse.json(document);
        }

        const documents = await DocumentExchangeService.searchDocuments(query, {
            sourceSystem: sourceSystem || undefined,
            targetSystem: targetSystem || undefined,
            documentType: documentType || undefined,
            status: status || undefined
        });

        return NextResponse.json(documents);
    } catch (error) {
        console.error('Error retrieving documents:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, status, metadata } = body;

        if (!id || !status) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const document = await DocumentExchangeService.updateDocumentStatus(
            id,
            status,
            metadata
        );

        return NextResponse.json(document);
    } catch (error) {
        console.error('Error updating document status:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { documentId, content, metadata } = body;

        if (!documentId || !content) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const version = await DocumentExchangeService.createDocumentVersion(
            documentId,
            content,
            metadata
        );

        return NextResponse.json(version);
    } catch (error) {
        console.error('Error creating document version:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 