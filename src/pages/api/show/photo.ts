export const prerender = false;

import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { sanityWriteClient, sanityClient } from '../../../lib/sanity';

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

    // Notificatie naar Ed (fire and forget)
    notifyPhotoUpload(showId, uploadedBy, message, asset).catch(console.error);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Photo upload error:', error);
    return new Response(JSON.stringify({ error: 'Upload mislukt' }), { status: 500 });
  }
};

async function notifyPhotoUpload(showId: string, uploadedBy: string, message: string, asset: any) {
  try {
    const resend = new Resend(import.meta.env.RESEND_API_KEY);

    // Haal show info op voor context
    const show = await sanityClient.fetch(
      `*[_type == "show" && _id == $id][0]{ city, slug }`,
      { id: showId }
    );

    const showSlug = show?.slug?.current || '';
    const city = show?.city || 'Onbekend';
    const imageUrl = asset?.url ? `${asset.url}?w=400&q=80` : '';
    const showPageUrl = `https://edstruijlaart.nl/shows/${showSlug}`;

    await resend.emails.send({
      from: 'Ed Struijlaart <ed@edstruijlaart.nl>',
      to: 'edstruijlaart@gmail.com',
      subject: `📸 Nieuwe foto van ${uploadedBy} — ${city}`,
      html: `
        <div style="font-family:-apple-system,sans-serif;max-width:500px;margin:0 auto;background:#0F0F0F;color:#F0EDE8;padding:32px;border-radius:12px;">
          <p style="color:#D4A843;font-size:13px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 12px;">📸 Nieuwe gastenfoto</p>
          <p style="font-size:16px;margin:0 0 8px;"><strong>${uploadedBy}</strong> heeft een foto geüpload voor ${city}.</p>
          ${message ? `<p style="color:#9B9B9B;font-size:14px;font-style:italic;margin:0 0 16px;">"${message}"</p>` : ''}
          ${imageUrl ? `<img src="${imageUrl}" alt="Gastenfoto" style="width:100%;max-width:400px;border-radius:8px;margin:16px 0;" />` : ''}
          <p style="margin:16px 0 0;"><a href="${showPageUrl}" style="color:#D4A843;text-decoration:none;">Bekijk showpagina →</a></p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Failed to send photo notification:', err);
  }
}
