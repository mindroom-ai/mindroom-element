# Mindroom long-text rendering

Element supports Mindroom "long text" payloads by promoting them from file-like
attachments into standard text bubbles. Mindroom sends events with
`msgtype: m.file` and a `io.mindroom.long_text` block when the message body is
uploaded to MXC storage. The renderer now recognises these events and performs
the following steps:

## Detection

* `getMindroomLongTextDescriptor` inspects the live event content, any
  `m.new_content` replacement, and the wire content to locate the Mindroom
  metadata. Detection runs before the message body type is resolved so we can
  switch away from `MFileBody`.
* The descriptor captures the MXC URI, encryption information, preview text,
  original format hints, and whether the event is a replacement. The marker
  `\n\n[Message continues in attached file]` is stripped from previews.

## Fetching & caching

* `useMindroomLongText` orchestrates downloads. Unencrypted payloads are
  fetched via `mediaFromContent` and `downloadSource`, encrypted payloads use
  `decryptFile`. Results are cached by MXC URI so scrollback does not refetch.
* The hook exposes `status` (`idle`, `loading`, `loaded`, `error`), the full
  text, and a retry handler. Cache helpers live in
  `src/utils/mindroomLongText.ts` and can be reset in tests via
  `__testing__.resetCache()`.

## Rendering

* `MindroomLongTextBody` provides text content to `TextualBody` by overriding
  `renderedContent`. While loading it shows the preview and an inline spinner;
  on success the bubble displays `m.text` with the full payload. Errors keep the
  preview visible and surface a retry button.
* `TextualBody` gained support for injected content and Mindroom status so the
  spinner/error UI integrates with existing message layouts.
* Attachment chrome (filename chips, download button) is suppressed by routing
  the event through `TextualBody`. A manual "Download original file" action is
  available from the context menu and uses `MediaEventHelper` + `FileDownloader`
  for encrypted or plain files.

## Streaming edits

* Event replacements trigger `MatrixEventEvent.Replaced`. The descriptor is
  recomputed on every render, so new uploads or transitions from streaming
  previews to final attachments update immediately. Cached MXCs are reused
  where possible.

## Testing & Storybook

* Unit tests (`test/utils/mindroomLongText-test.tsx`) cover unencrypted and
  encrypted downloads, replacements, retries, caching, and the loading-state
  preview behaviour. Download/decrypt helpers are mocked to avoid network IO.
* Storybook stories (`Messages/Mindroom Long Text`) provide loading, error, and
  loaded examples across light and dark themes for visual QA.

## Developer notes

* When constructing new events ensure the `io.mindroom.long_text` block is
  present and either `url` (unencrypted) or `file` (encrypted) contains the MXC
  reference.
* The continuation marker must remain exactly `\n\n[Message continues in
  attached file]` to be removed from previews.
* Cache keys are the MXC URI. Uploading a new version under the same URI will
  reuse the cached text unless the cache is cleared.
