// Pixore website settings: the ONLY file to edit for links. The download links point at the newest GitHub Release of
// the site repo ("latest/download/<file>"), so a new release never needs a site change: just upload the files
// (tools/release/publish_site.sh). REPO is filled in when the site repo exists.
const SITE = {
  repo: "keburulla19/pixore-site",            // the public site repo: downloads = its latest release (publish_site.sh)
  discord: "https://discord.gg/yTE9RgfEEu",
  version: "Open beta",                       // shown under the download buttons
  launch: "2026-11-27T16:00:00+02:00",         // the beta opens (Finnish time): until then the download buttons count down
  windows: { file: "Pixore-Windows.zip", size: "about 70 MB" },
  android: { file: "Pixore.apk", size: "about 72 MB" },
};
