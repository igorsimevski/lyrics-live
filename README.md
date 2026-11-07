# Lyrics Live

A static viewer for the YouTube MP3 Android app's shared Telegraph page. Every
Publish still overwrites the same Telegraph page. This viewer checks that public
page every three seconds and replaces the displayed song when its title or lyrics
change, without reloading the browser. Unchanged lyrics keep their scroll position.

The public link is always **https://igorsimevski.github.io/lyrics-live**. No anchor,
query parameter, sign-in, or page selection is needed. GitHub redirects the
address to its directory URL with a trailing slash.

The fixed source is https://telegra.ph/YouTube-MP3-lyrics-11-01. `FIXED_PAGE_PATH`
in `telegraph.mjs` and `LyricsPage.TELEGRAPH_PATH` in the Android app identify that
same page. Older viewer bookmarks containing an anchor normalize to this fixed
source and remove the anchor. Visitors cannot select another page through the URL.

No backend, database, account, build step, or npm dependencies are needed. The
app's private Telegraph access token must never be included in the viewer or its
repository.

## Hosting and Android connection

Source repository: https://github.com/igorsimevski/lyrics-live

GitHub Pages serves `main`, `/ (root)`, using **Deploy from a branch** in the
repository's **Settings → Pages**. Put this directory's contents at the root of
that repository to publish an update.

The Android app defaults to the fixed viewer link. Build normally:

```sh
cd android
./gradlew :app:assembleDebug
```

**QR code**, **Copy link**, and the published-link message all share the same
bare address. `lyricsViewerUrl` can override the HTTPS viewer host; an explicitly
empty `-PlyricsViewerUrl=` shares the original Telegraph URL for manual refresh.

Publishing reuses the existing shared page's credentials in the app's private
preferences. It never creates another page. An installation without those
credentials, or configured for another Telegraph page, reports an error instead
of publishing lyrics that the fixed viewer would not display. Preserve the
existing installation's app data when updating; a fresh installation needs the
shared page's publishing credentials provisioned privately. They are not bundled
in the APK or the public repository.

## Behavior

- Displays Unicode lyrics with original line breaks and spacing between stanzas.
- Treats published lyrics as text; remote scripts, markup, and embeds never execute.
- Keeps the last lyrics visible on connection errors, retries with increasing
  delays up to 30 seconds, and returns to three-second checks after recovery.
- Stops polling while the tab is hidden and checks immediately when it is visible
  again. Only one request runs at a time per active viewer.
- Uses a 12-second request timeout and bypasses browser caches. Timing depends on
  the network and browser scheduling; Publish is visible after the next successful
  check. Offline publication cannot reach viewers.

## Verification

Requires Node.js 22+ only for tests:

```sh
node --test tests/*.test.mjs
```

The tests use fake HTTP responses and a fake scheduler; they never publish lyrics
or contact Telegraph. They cover replacement after another publication, unchanged
content, bounded retry/recovery, stopped in-flight work, safe text extraction,
Unicode, malformed content, and public-only request construction.
