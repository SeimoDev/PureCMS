import { webmasterVerificationsFromSeo } from './seoSettings.js'

function assertEqual(actual: string | undefined, expected: string | undefined, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

const verifications = webmasterVerificationsFromSeo({
  baiduSiteVerification: 'codeva-baidu',
  googleSiteVerification: 'google-code',
  bingSiteVerification: 'bing-code',
  so360SiteVerification: '360-code',
  sogouSiteVerification: 'sogou-code',
})

assertEqual(verifications.baidu, 'codeva-baidu', 'baidu maps to document meta key')
assertEqual(verifications.google, 'google-code', 'google maps to document meta key')
assertEqual(verifications.bing, 'bing-code', 'bing maps to document meta key')
assertEqual(verifications.so360, '360-code', '360 maps to document meta key')
assertEqual(verifications.sogou, 'sogou-code', 'sogou maps to document meta key')

const empty = webmasterVerificationsFromSeo(undefined)

assertEqual(empty.baidu, undefined, 'missing seo leaves baidu empty')
assertEqual(empty.google, undefined, 'missing seo leaves google empty')
