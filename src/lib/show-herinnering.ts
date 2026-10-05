/**
 * Gedeelde stukken van de herinneringsmail, gebruikt door de cron (send-reminder) en door een
 * late aanmelding (signup). Elke gast krijgt hooguit één mail: vóór het versturen claimt de
 * aanroeper het emailSignup-document met reminderSentAt (met ifRevisionID), zodat een dubbele
 * cron-run of een gelijktijdige late aanmelding hem niet nóg een keer stuurt. Audit #23.
 */
import { sanityWriteClient } from './sanity';
import { buildReminderEmail } from './email-templates';

/** Velden van een show die de herinneringsmail nodig heeft (GROQ-projectie). */
export const HERINNERING_SHOW_VELDEN = `
  _id,
  title,
  city,
  hostName,
  hostEmail,
  startDateTime,
  status,
  reminderSent,
  slug,
  bootlegUrl,
  bootlegExpiresAt,
  youtubeVideos[0] { url },
  "heroImageUrl": heroImage.asset->url
`;

export interface HerinneringShow {
  _id: string;
  city: string;
  hostName?: string;
  hostEmail?: string;
  startDateTime?: string;
  status?: string;
  reminderSent?: boolean;
  slug?: { current?: string };
  bootlegUrl?: string;
  bootlegExpiresAt?: string;
  youtubeVideos?: unknown;
  heroImageUrl?: string;
}

/**
 * Claim een aanmelding voor de herinneringsmail. Geeft false als hij al geclaimd of verstuurd is.
 *
 * Wijzigde iets anders het document intussen (bijvoorbeeld de Listmonk-sync die
 * syncedToListmonk zet), dan lezen we opnieuw en proberen het nog eens: alleen een al gezette
 * reminderSentAt is een reden om over te slaan.
 */
export async function claimHerinnering(signupId: string, rev: string): Promise<boolean> {
  let huidigeRev = rev;
  for (let poging = 1; poging <= 3; poging++) {
    try {
      await sanityWriteClient
        .patch(signupId)
        .ifRevisionId(huidigeRev)
        .set({ reminderSentAt: new Date().toISOString() })
        .commit();
      return true;
    } catch (err: any) {
      if (err?.statusCode !== 409) throw err;
      const vers: { _rev: string; reminderSentAt?: string } | null = await sanityWriteClient.fetch(
        `*[_id == $id][0]{ _rev, reminderSentAt }`,
        { id: signupId }
      );
      if (!vers || vers.reminderSentAt) return false;
      huidigeRev = vers._rev;
    }
  }
  return false;
}

/** Versturen mislukt: claim terugdraaien, zodat de data klopt en een herhaling hem oppakt. */
export async function geefClaimTerug(signupId: string): Promise<void> {
  await sanityWriteClient.patch(signupId).unset(['reminderSentAt']).commit();
}

export function bouwHerinnering(
  show: HerinneringShow,
  signup: { _id: string; firstName: string; email: string },
  cronSecret: string | undefined,
): { subject: string; html: string } {
  // Overgenomen zoals het was. Let op: `youtubeVideos[0] { url }` levert een object, geen array,
  // dus dit valt in de praktijk altijd terug op de standaardvideo (waar de mailtekst over gaat).
  let youtubeVideoId: string | undefined;
  const videoUrl = (show.youtubeVideos as any)?.[0]?.url;
  if (videoUrl) {
    const match = String(videoUrl).match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    youtubeVideoId = match?.[1];
  }
  const isHost = !!(show.hostEmail && signup.email.toLowerCase() === show.hostEmail.toLowerCase());

  return buildReminderEmail({
    firstName: signup.firstName,
    city: show.city,
    hostName: show.hostName,
    bootlegUrl: show.bootlegUrl,
    bootlegExpiresAt: show.bootlegExpiresAt,
    showSlug: show.slug?.current || '',
    showId: show._id,
    signupId: signup._id,
    youtubeVideoId,
    heroImageUrl: show.heroImageUrl ? `${show.heroImageUrl}?w=600&q=80` : undefined,
    email: signup.email,
    cronSecret,
    isHost,
  });
}
