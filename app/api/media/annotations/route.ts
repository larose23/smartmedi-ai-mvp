import { NextRequest, NextResponse } from 'next/server';
import { MediaManagementService } from '@/lib/services/MediaManagementService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mediaId, type, coordinates, label, color, notes } = body;

    if (!mediaId || !type || !coordinates) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const annotation = await MediaManagementService.addAnnotation({
      mediaId,
      type,
      coordinates,
      label,
      color,
      notes,
    });

    return NextResponse.json(annotation);
  } catch (error) {
    console.error('Error adding annotation:', error);
    return NextResponse.json(
      { error: 'Failed to add annotation' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mediaId = searchParams.get('mediaId');

    if (!mediaId) {
      return NextResponse.json(
        { error: 'Missing mediaId parameter' },
        { status: 400 }
      );
    }

    const annotations = await MediaManagementService.getAnnotations(mediaId);
    return NextResponse.json(annotations);
  } catch (error) {
    console.error('Error fetching annotations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch annotations' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const annotationId = searchParams.get('annotationId');

    if (!annotationId) {
      return NextResponse.json(
        { error: 'Missing annotationId parameter' },
        { status: 400 }
      );
    }

    await MediaManagementService.deleteAnnotation(annotationId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting annotation:', error);
    return NextResponse.json(
      { error: 'Failed to delete annotation' },
      { status: 500 }
    );
  }
} 