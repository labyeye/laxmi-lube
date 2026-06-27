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

            if (payload.startsWith("RECEIVED:")) {
              const collectionId = payload.replace("RECEIVED:", "");
              await Collection.findByIdAndUpdate(collectionId, {
                whatsappStatus: "received",
                whatsappConfirmedAt: new Date(),
                whatsappConfirmedBy: senderPhone,
              });
              console.log(
                `Collection ${collectionId} marked RECEIVED by ${senderPhone}`,
              );
            } else if (payload.startsWith("NOT_RECEIVED:")) {
              const collectionId = payload.replace("NOT_RECEIVED:", "");
              await Collection.findByIdAndUpdate(collectionId, {
                whatsappStatus: "not_received",
                whatsappConfirmedAt: new Date(),
                whatsappConfirmedBy: senderPhone,
              });
              console.log(
                `Collection ${collectionId} marked NOT_RECEIVED by ${senderPhone}`,
              );
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
