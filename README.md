# Lyrics Live

A static viewer for the YouTube MP3 Android app's shared Telegraph page. Every
Publish still overwrites the same Telegraph page. This viewer checks that public
page every three seconds and replaces the displayed song when its title or lyrics
change, without reloading the browser. Unchanged lyrics keep their scroll position.

No backend, database, account, build step, or npm dependencies are needed. Only the
public Telegraph page path appears in the viewer link, after `#`. The app's private
Telegraph access token must never be included in the viewer or its repository.

## Hosting on GitHub Pages

Source repository: https://github.com/igorsimevski/lyrics-live

Public viewer address: https://igorsimevski.github.io/lyrics-live/
(requires Pages to be enabled on `main`, `/ (root)`).

1. Put this directory's contents at the root of the new GitHub repository.
2. In the repository's **Settings → Pages**, choose **Deploy from a branch**,
   then select `main` and `/ (root)`.
3. Wait for Pages to report its HTTPS address, normally
   `https://igorsimevski.github.io/lyrics-live/`.
4. Build the Android app using that verified address:

   ```sh
   cd android
   ./gradlew :app:assembleDebug -PlyricsViewerUrl=https://igorsimevski.github.io/lyrics-live/
   ```

   Alternatively set `lyricsViewerUrl=https://igorsimevski.github.io/lyrics-live/` in
   your local Gradle user properties. Builds without this setting continue to
   share the original Telegraph link, which needs a manual browser refresh.

The app's **QR code**, **Copy link**, and published-link message use the configured
viewer address. Existing stored Telegraph pages are reused; no migration or new
page is needed. An old Telegraph link can also be pasted into the viewer's welcome
screen. An already-open native Telegraph page still needs to be refreshed or
replaced with its Lyrics Live link.

For example, `https://igorsimevski.github.io/lyrics-live/#Lyrics-11-01` follows
`https://telegra.ph/Lyrics-11-01`. The link stays the same when another song is
published. Pages hosting must allow public, anonymous browser access for the QR
code to work on another phone.

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
