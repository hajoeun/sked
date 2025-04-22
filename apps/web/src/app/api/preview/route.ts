import { NextRequest, NextResponse } from 'next/server';
import { fetchSkedApi } from '@/lib/api'; // Existing Sked API fetch utility

/**
 * Acts as a proxy to the backend's /api/metadata endpoint.
 * @route POST /api/preview
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'A valid URL must be provided in the request body.' },
        { status: 400 }
      );
    }

    // Use fetchSkedApi to call the actual backend endpoint in apps/server
    const response = await fetchSkedApi('/api/metadata', { // Note: Using the relative path for the backend API
      method: 'POST',
      body: JSON.stringify({ url }),
      // fetchSkedApi should handle headers like Content-Type and potential API keys
    });

    // Assuming fetchSkedApi throws an error if !response.ok
    const metadata = await response.json();
    return NextResponse.json(metadata);

  } catch (error) {
    console.error('[API Proxy Error] Failed to fetch metadata:', error);
    // Forward the error details from fetchSkedApi or provide a generic message
    return NextResponse.json(
      {
        error: 'Failed to retrieve URL metadata via backend.',
        details: error instanceof Error ? error.message : 'Unknown server error',
      },
      { status: 500 } // Or determine status based on the caught error if possible
    );
  }
} 