/**
 * The <head> half of lib/media/photoReady.ts, in its own module so the
 * string stays on the server (the root layout inlines it) and out of every
 * page's JavaScript. Kept as a literal so it ships as written; the test runs
 * it against a fake document to keep it in step with markPhotoReady.
 */
export const PHOTO_READY_SCRIPT =
  "(function(){document.addEventListener('load',function(e){var t=e.target;" +
  "if(t&&t.tagName==='IMG'&&t.hasAttribute('data-fade')&&t.naturalWidth>0)" +
  "t.setAttribute('data-loaded','')},true)})()"
