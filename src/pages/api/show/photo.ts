export const prerender = false;

import type { APIRoute } from 'astro';
import { sanityWriteClient } from '../../../lib/sanity';

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const showId = formData.get('showId') as string;
    const uploadedBy = (formData.get('uploadedBy') as string) || 'Anoniem';
    const message = (formData.get('message') as string)?.trim() || '';
    const photo = formData.get('photo') as File;

    if (!showId || !photo) {
      return new Response(JSON.stringify({ error: 'Verplichte velden ontbreken' }), { status: 400 });
    }

    // Check bestandsgrootte (max 10MB)
    if (photo.size > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'Foto is te groot (max 10MB)' }), { status: 400 });
    }

    // Check file type
    if (!photo.type.startsWith('image/')) {
      return new Response(JSON.stringify({ error: 'Alleen afbeeldingen zijn toegestaan' }), { status: 400 });
    }

    // Upload naar Sanity assets
    const buffer = Buffer.from(await photo.arrayBuffer());
    const asset = await sanityWriteClient.assets.upload('image', buffer, {
      filename: photo.name,
      contentType: photo.type,
    });

    // Voeg toe aan show.guestPhotos[]
    const key = Math.random().toString(36).slice(2, 10);
    await sanityWriteClient
      .patch(showId)
      .setIfMissing({ guestPhotos: [] })
      .append('guestPhotos', [{
        _key: key,
        image: {
          _type: 'image',
          asset: { _type: 'reference', _ref: asset._id },
        },
        uploadedBy: uploadedBy.trim().slice(0, 100),
        message: message.slice(0, 280),
        approved: true,
        uploadedAt: new Date().toISOString(),
      }])
      .commit();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Photo upload error:', error);
    return new Response(JSON.stringify({ error: 'Upload mislukt' }), { status: 500 });
  }
};
