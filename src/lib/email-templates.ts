/**
 * Herinneringsmail template voor huiskamerconcerten.
 * Wordt automatisch verstuurd de ochtend na een concert.
 */

interface ReminderMailData {
  firstName: string;
  city: string;
  hostName?: string;
  bootlegUrl?: string;
  bootlegExpiresAt?: string;
  setlist?: Array<{ title: string; artist: string; isOriginal: boolean }>;
  spotifyPlaylistUrl?: string;
  showSlug: string;
  youtubeVideoId?: string;
}

const DEFAULT_YOUTUBE_VIDEO = 'GBx2WfYluWE';
const SITE_URL = 'https://edstruijlaart.nl';

export function buildReminderEmail(data: ReminderMailData): { subject: string; html: string } {
  const {
    firstName,
    city,
    hostName,
    bootlegUrl,
    bootlegExpiresAt,
    setlist,
    spotifyPlaylistUrl,
    showSlug,
    youtubeVideoId,
  } = data;

  const videoId = youtubeVideoId || DEFAULT_YOUTUBE_VIDEO;
  const showUrl = `${SITE_URL}/shows/${showSlug}`;
  const bookingUrl = `${SITE_URL}/contact`;

  const subject = bootlegUrl
    ? `De opname van ${city} — jouw herinneringspakket 🎵`
    : `Wat een avond in ${city} — jouw herinneringspakket 🎵`;

  // Bootleg sectie (alleen als er een opname is)
  const bootlegSection = bootlegUrl
    ? `
    <tr>
      <td style="padding: 0 32px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1A1A1A; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="padding: 24px 28px;">
              <p style="color: #D4A843; font-size: 13px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; margin: 0 0 12px;">🎵 De opname van jouw avond</p>
              <p style="color: #F0EDE8; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Download de live-opname van het huiskamerconcert. Bewaar hem goed — deze link is 30 dagen geldig.
              </p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: #B8860B; border-radius: 9999px;">
                    <a href="${bootlegUrl}" style="display: inline-block; padding: 14px 32px; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none;">
                      ↓ Download opname
                    </a>
                  </td>
                </tr>
              </table>
              ${bootlegExpiresAt ? `<p style="color: #9B9B9B; font-size: 13px; margin: 16px 0 0;">Geldig tot ${new Date(bootlegExpiresAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</p>` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>`
    : '';

  // Setlist sectie
  const setlistSection =
    setlist && setlist.length > 0
      ? `
    <tr>
      <td style="padding: 0 32px 32px;">
        <p style="color: #D4A843; font-size: 13px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; margin: 0 0 16px;">📋 Setlist</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${setlist
            .map(
              (song, i) => `
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #2a2a2a;">
              <span style="color: #D4A843; font-size: 14px; display: inline-block; width: 28px;">${i + 1}.</span>
              <span style="color: #F0EDE8; font-size: 15px; font-weight: 500;">${song.title}</span>
              <span style="color: #9B9B9B; font-size: 14px;"> — ${song.isOriginal ? 'Ed Struijlaart' : song.artist}</span>
            </td>
          </tr>`
            )
            .join('')}
        </table>
        ${
          spotifyPlaylistUrl
            ? `
        <table cellpadding="0" cellspacing="0" style="margin-top: 20px;">
          <tr>
            <td style="background-color: #1DB954; border-radius: 9999px;">
              <a href="${spotifyPlaylistUrl}" style="display: inline-block; padding: 12px 28px; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none;">
                🎧 Luister de playlist op Spotify
              </a>
            </td>
          </tr>
        </table>`
            : ''
        }
      </td>
    </tr>`
      : '';

  // Video sectie
  const videoSection = `
    <tr>
      <td style="padding: 0 32px 32px;">
        <p style="color: #D4A843; font-size: 13px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; margin: 0 0 16px;">🎬 Bekijk de video</p>
        <a href="https://www.youtube.com/watch?v=${videoId}" style="display: block; text-decoration: none;">
          <img src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg" alt="Bekijk video van Ed Struijlaart" style="width: 100%; max-width: 520px; border-radius: 8px; display: block;" />
        </a>
        <p style="margin: 12px 0 0;">
          <a href="https://www.youtube.com/watch?v=${videoId}" style="color: #D4A843; font-size: 15px; text-decoration: none;">▶ Bekijk de video op YouTube</a>
        </p>
      </td>
    </tr>`;

  // Gastenboek sectie
  const guestbookSection = `
    <tr>
      <td style="padding: 0 32px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1A1A1A; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="padding: 24px 28px; text-align: center;">
              <p style="color: #D4A843; font-size: 13px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; margin: 0 0 12px;">📖 Gastenboek</p>
              <p style="color: #F0EDE8; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Bekijk wat andere gasten schreven over de avond.
              </p>
              <a href="${showUrl}" style="color: #D4A843; font-size: 15px; text-decoration: none; font-weight: 500;">Bekijk de showpagina →</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;

  const html = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0F0F0F; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0F0F0F;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

          <!-- Header -->
          <tr>
            <td style="text-align: center; padding: 0 32px 32px;">
              <p style="color: #D4A843; font-size: 13px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 8px;">Ed Struijlaart</p>
              <p style="color: #9B9B9B; font-size: 14px; margin: 0;">Huiskamerconcert</p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <div style="height: 1px; background: linear-gradient(to right, transparent, #D4A843, transparent);"></div>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <p style="color: #F0EDE8; font-size: 22px; font-weight: 400; margin: 0 0 16px; font-family: Georgia, 'Times New Roman', serif;">
                Hey ${firstName},
              </p>
              <p style="color: #F0EDE8; font-size: 16px; line-height: 1.7; margin: 0;">
                Bedankt dat je er was${hostName ? ` bij ${hostName}` : ''} in ${city}. Wat een avond.
                ${bootlegUrl ? ' Hier is alles om de avond opnieuw te beleven.' : ' Hier zijn een paar herinneringen aan de avond.'}
              </p>
            </td>
          </tr>

          ${bootlegSection}
          ${setlistSection}
          ${videoSection}
          ${guestbookSection}

          <!-- Divider -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <div style="height: 1px; background: linear-gradient(to right, transparent, #D4A843, transparent);"></div>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding: 0 32px 32px; text-align: center;">
              <p style="color: #F0EDE8; font-size: 16px; line-height: 1.7; margin: 0 0 4px;">
                Wil je weer een keer? Houd je inbox in de gaten.
              </p>
              <p style="color: #F0EDE8; font-size: 16px; line-height: 1.7; margin: 0 0 20px;">
                Of organiseer zelf een huiskamerconcert:
              </p>
              <table cellpadding="0" cellspacing="0" align="center">
                <tr>
                  <td style="background-color: #B8860B; border-radius: 9999px;">
                    <a href="${bookingUrl}" style="display: inline-block; padding: 14px 32px; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none;">
                      Boek een huiskamerconcert
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Sign off -->
          <tr>
            <td style="padding: 0 32px 40px;">
              <p style="color: #F0EDE8; font-size: 16px; line-height: 1.7; margin: 0;">
                Tot de volgende,<br />
                <span style="color: #D4A843;">Ed</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 0 32px 16px;">
              <div style="height: 1px; background-color: #2a2a2a;"></div>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 40px; text-align: center;">
              <p style="color: #6B6B6B; font-size: 12px; line-height: 1.6; margin: 0;">
                Je ontvangt deze mail omdat je je hebt aangemeld bij het huiskamerconcert in ${city}.<br />
                <a href="${SITE_URL}" style="color: #9B9B9B; text-decoration: none;">edstruijlaart.nl</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}
