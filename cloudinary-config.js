// ─────────────────────────────────────────────────────────────
// Cloudinary is the pick for photo uploads — it's what you used
// on CavinClicksWear, has a generous free tier (25 credits/month,
// plenty for listing photos), and needs no backend server: the
// browser uploads straight to Cloudinary using an "unsigned"
// upload preset.
//
// Setup:
// 1. Go to your Cloudinary dashboard (or create a free account
//    at cloudinary.com).
// 2. Settings → Upload → Upload presets → Add upload preset.
//    Set "Signing Mode" to "Unsigned". Name it (e.g. "sakan_listings").
// 3. Copy your Cloud Name from the dashboard home page.
// 4. Fill both values in below.
// ─────────────────────────────────────────────────────────────
export const cloudinaryConfig = {
  cloudName: "dsb9ouetd",
  uploadPreset: "sakan_listings"
};
