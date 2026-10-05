export const prerender = false;

import type { APIRoute } from 'astro';
import { sanityWriteClient, sanityClient } from '../../../lib/sanity';
import { isActieveShow, isGeldigDocId, isGestart } from '../../../lib/show-veiligheid';
import { nieuweItemKey, stuurModeratieMelding, voorafModereren } from '../../../lib/show-moderatie';

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const showId = formData.get('showId');
    const uploadedByRaw = formData.get('uploadedBy');
    const messageRaw = formData.get('message');
    const photo = formData.get('photo');
    const honeypot = formData.get('honeypot');

    // Honeypot check - bots vullen dit in, echte gebruikers niet
    if (honeypot) {
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    if (!isGeldigDocId(showId) || !(photo instanceof File)) {
      return new Response(JSON.stringify({ error: 'Verplichte velden ontbreken' }), { status: 400 });
    }
    const uploadedBy = (typeof uploadedByRaw === 'string' && uploadedByRaw.trim() ? uploadedByRaw : 'Anoniem').trim().slice(0, 100);
    const message = (typeof messageRaw === 'string' ? messageRaw : '').trim().slice(0, 280);

    // Valideer dat show bestaat, niet gearchiveerd is en begonnen is (het formulier staat pas
    // na de aanvang op de pagina; daarna blijft het open, gasten sturen foto's ook dagen later)
    const show = await sanityClient.fetch(
      `*[_type == "show" && _id == $id][0]{_id, status, startDateTime, city, "slug": slug.current}`,
      { id: showId }
    );
    if (!isActieveShow(show) || !isGestart(show.startDateTime)) {
      return new Response(JSON.stringify({ error: 'Show niet gevonden' }), { status: 404 });
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
    const key = nieuweItemKey();
    const zichtbaar = !voorafModereren();
    await sanityWriteClient
      .patch(showId)
      .setIfMissing({ guestPhotos: [] })
      .append('guestPhotos', [{
        _key: key,
        image: {
          _type: 'image',
          asset: { _type: 'reference', _ref: asset._id },
        },
        uploadedBy,
        message,
        approved: zichtbaar,
        uploadedAt: new Date().toISOString(),
      }])
      .commit();

    // Notificatie naar Ed met verberg-/toonknop (fire and forget). Alles ge-escaped (audit #42).
    stuurModeratieMelding({
      showId, city: show.city, slug: show.slug, type: 'photo', key,
      naam: uploadedBy, bericht: message,
      fotoUrl: asset?.url ? `${asset.url}?w=400&q=80` : undefined,
      zichtbaar,
    }).catch((err) => console.error('Failed to send photo notification:', err));

    return new Response(JSON.stringify({ success: true, zichtbaar }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Photo upload error:', error);
    return new Response(JSON.stringify({ error: 'Upload mislukt' }), { status: 500 });
  }
};
