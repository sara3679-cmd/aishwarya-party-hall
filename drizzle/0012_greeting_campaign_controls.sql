CREATE TABLE IF NOT EXISTS greeting_campaign_settings (
  campaign_id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL DEFAULT 'greeting',
  approved_hash TEXT,
  approved_at TEXT
);
CREATE TABLE IF NOT EXISTS greeting_manual_sends (
  campaign_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  marked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (campaign_id, phone_number)
);
