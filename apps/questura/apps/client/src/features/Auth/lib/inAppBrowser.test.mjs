import assert from 'node:assert/strict'
import test from 'node:test'

import { detectInAppBrowser } from './inAppBrowser.ts'

const IG_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 357.0.0.25.101 (iPhone15,2; iOS 18_1; en_US; en; scale=3.00; 1179x2556; 662981123)'
const IG_ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP1A.240505.005; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.6367.179 Mobile Safari/537.36 Instagram 330.0.0.40.92 Android (34/14; 420dpi; 1080x2400; Google/google; Pixel 8; shiba; shiba; en_US; 598323397)'
const FB_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/470.0.0.40.97;FBBV/612345678;FBDV/iPhone14,5;FBMD/iPhone;FBSN/iOS;FBSV/17.5;FBSS/3;FBID/phone;FBLC/en_US;FBOP/5]'
const TIKTOK =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_34.1.0 JsSdk/2.0 NetType/WIFI Channel/App Store ByteLocale/en Region/US'
const ANDROID_WEBVIEW =
  'Mozilla/5.0 (Linux; Android 13; SM-S911B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36'
const SAFARI_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'
const CHROME_ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'
const CHROME_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

test('names the app for social in-app browsers, where Google refuses sign-in', () => {
  assert.equal(detectInAppBrowser(IG_IOS), 'Instagram')
  assert.equal(detectInAppBrowser(IG_ANDROID), 'Instagram')
  assert.equal(detectInAppBrowser(FB_IOS), 'Facebook')
  assert.equal(detectInAppBrowser(TIKTOK), 'TikTok')
})

test('an unnamed Android WebView still counts', () => {
  assert.equal(detectInAppBrowser(ANDROID_WEBVIEW), 'this app')
})

test('real browsers keep the Google button', () => {
  assert.equal(detectInAppBrowser(SAFARI_IOS), null)
  assert.equal(detectInAppBrowser(CHROME_ANDROID), null)
  assert.equal(detectInAppBrowser(CHROME_MAC), null)
  assert.equal(detectInAppBrowser(''), null)
})
