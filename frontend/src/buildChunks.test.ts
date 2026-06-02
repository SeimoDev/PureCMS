import { cmsManualChunk } from './buildChunks.js'

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: got ${String(actual)}, want ${String(expected)}`)
  }
}

assertEqual(cmsManualChunk('/node_modules/react/index.js'), 'react-vendor', 'react chunk')
assertEqual(cmsManualChunk('/node_modules/react-dom/client.js'), 'react-vendor', 'react-dom chunk')
assertEqual(cmsManualChunk('/node_modules/@mui/material/Button/Button.js'), 'mui-vendor', 'mui chunk')
assertEqual(cmsManualChunk('/node_modules/@emotion/react/dist/emotion-react.esm.js'), 'mui-vendor', 'emotion chunk')
assertEqual(cmsManualChunk('/node_modules/lucide-react/dist/esm/icons/menu.js'), 'icon-vendor', 'icon chunk')
assertEqual(cmsManualChunk('/src/pages/PublicHomePage.tsx'), undefined, 'app chunk falls back to route splitting')
