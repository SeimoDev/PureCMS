import type { WebmasterVerifications } from './documentMeta'
import type { SiteSettings } from './types'

export function webmasterVerificationsFromSeo(seo?: SiteSettings['seo']): WebmasterVerifications {
  return {
    baidu: seo?.baiduSiteVerification,
    google: seo?.googleSiteVerification,
    bing: seo?.bingSiteVerification,
    so360: seo?.so360SiteVerification,
    sogou: seo?.sogouSiteVerification,
  }
}
