const express = require("express");
const router = express.Router();
const Collection = require("../models/Collection");

// ── Webhook verification (Meta sends a GET to verify your endpoint) ───────────
router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log("WhatsApp webhook verified");
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// ── Incoming messages / button clicks ─────────────────────────────────────────
router.post("/", async (req, res) => {
  // Always respond 200 immediately so Meta doesn't retry
  res.sendStatus(200);

  try {
    const body = req.body;
    if (body.object !== "whatsapp_business_account") return;

    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const messages = change.value?.messages || [];
        for (const msg of messages) {
          // Quick-reply button response
          if (msg.type === "button") {
            const payload = msg.button?.payload || "";
            const senderPhone = msg.from; // e.g. "919876543210"

            // Payloads are either:
            //   RECEIVED:<collectionId>         – single collection
            //   NOT_RECEIVED:<collectionId>     – single collection
            //   RECEIVED:GROUP:<paymentGroupId> – combined group receipt
            //   NOT_RECEIVED:GROUP:<paymentGroupId>
            let status = null;
            let rest = null;

            if (payload.startsWith("RECEIVED:")) {
              status = "received";
              rest = payload.slice("RECEIVED:".length);
            } else if (payload.startsWith("NOT_RECEIVED:")) {
              status = "not_received";
              rest = payload.slice("NOT_RECEIVED:".length);
            }

            if (status && rest) {
              const update = {
                whatsappStatus: status,
                whatsappConfirmedAt: new Date(),
                whatsappConfirmedBy: senderPhone,
              };

              if (rest.startsWith("GROUP:")) {
                // Group receipt — update every collection in the group
                const paymentGroupId = rest.slice("GROUP:".length);
                await Collection.updateMany({ paymentGroupId }, update);
                console.log(`Group ${paymentGroupId} marked ${status.toUpperCase()} by ${senderPhone}`);
              } else {
                // Single collection
                const collectionId = rest;
                await Collection.findByIdAndUpdate(collectionId, update);
                console.log(`Collection ${collectionId} marked ${status.toUpperCase()} by ${senderPhone}`);
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("WhatsApp webhook processing error:", err.message);
  }
});

module.exports = router;
