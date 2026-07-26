/**
 * CJ Dropshipping Webhook Handler
 * Receives notifications from CJ (tracking updates, order status changes)
 * Forwards them to the store owner via email notification
 */

export default async function handler(req: any, res: any) {
  // CJ sends POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body;
    const timestamp = new Date().toISOString();

    // Log the webhook for Vercel logs
    console.log('[CJ-WEBHOOK]', timestamp, JSON.stringify(payload));

    // Extract key info from CJ notification
    const orderInfo = extractOrderInfo(payload);

    // Send email notification via Formspree
    await sendNotification(orderInfo, timestamp);

    // Return 200 OK to CJ so they know we received it
    return res.status(200).json({ success: true, received: timestamp });
  } catch (error: any) {
    console.error('[CJ-WEBHOOK ERROR]', error);
    // Still return 200 to CJ to prevent retries
    return res.status(200).json({ success: true, note: 'logged with error' });
  }
}

function extractOrderInfo(payload: any): Record<string, string> {
  // CJ webhook formats vary — extract what we can
  const info: Record<string, string> = {};

  // Common CJ fields
  if (payload.orderNum || payload.orderId || payload.orderNumber) {
    info['Commande CJ'] = payload.orderNum || payload.orderId || payload.orderNumber;
  }
  if (payload.trackingNumber || payload.logisticsNum) {
    info['Numéro de suivi'] = payload.trackingNumber || payload.logisticsNum;
  }
  if (payload.orderStatus || payload.status) {
    info['Statut'] = payload.orderStatus || payload.status;
  }
  if (payload.shippingCompany || payload.logisticsName) {
    info['Transporteur'] = payload.shippingCompany || payload.logisticsName;
  }
  if (payload.type) {
    info['Type'] = payload.type;
  }

  // If we couldn't parse known fields, include raw data
  if (Object.keys(info).length === 0) {
    info['Données brutes'] = JSON.stringify(payload).substring(0, 500);
  }

  return info;
}

async function sendNotification(info: Record<string, string>, timestamp: string) {
  // Build email body
  let message = `📦 Notification CJ Dropshipping — ${timestamp}\n\n`;
  for (const [key, value] of Object.entries(info)) {
    message += `${key}: ${value}\n`;
  }

  // Send via Formspree (VIDUK dedicated form)
  try {
    await fetch('https://formspree.io/f/xeenzdpg', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'jesabella.jm@gmail.com',
        subject: `[VIDUK] Notification CJ — ${info['Statut'] || info['Type'] || 'Mise à jour'}`,
        message,
        _replyto: 'noreply@viduk.de',
      }),
    });
  } catch (e) {
    console.error('[CJ-WEBHOOK] Email notification failed:', e);
  }
}
