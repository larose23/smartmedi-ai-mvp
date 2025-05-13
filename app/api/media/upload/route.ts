import { NextRequest, NextResponse } from 'next/server';
import { MediaManagementService } from '@/lib/services/MediaManagementService';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const patientId = formData.get('patientId') as string;
    const encounterId = formData.get('encounterId') as string;

    if (!file || !patientId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const media = await MediaManagementService.uploadMedia(
      patientId,
      file,
      encounterId
    );

    return NextResponse.json(media);
  } catch (error) {
    console.error('Error uploading media:', error);
    return NextResponse.json(
      { error: 'Failed to upload media' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const patientId = searchParams.get('patientId');
    const encounterId = searchParams.get('encounterId');

    if (!patientId) {
      return NextResponse.json(
        { error: 'Missing patientId parameter' },
        { status: 400 }
      );
    }

    const media = await MediaManagementService.getMedia(patientId, encounterId);
    return NextResponse.json(media);
  } catch (error) {
    console.error('Error fetching media:', error);
    return NextResponse.json(
      { error: 'Failed to fetch media' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mediaId = searchParams.get('mediaId');

    if (!mediaId) {
      return NextResponse.json(
        { error: 'Missing mediaId parameter' },
        { status: 400 }
      );
    }

    await MediaManagementService.deleteMedia(mediaId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting media:', error);
    return NextResponse.json(
      { error: 'Failed to delete media' },
      { status: 500 }
    );
  }
} 