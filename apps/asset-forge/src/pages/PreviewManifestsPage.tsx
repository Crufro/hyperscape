import React from 'react'

import { PreviewManifestEditor } from '@/components/Manifests/PreviewManifestEditor'

export const PreviewManifestsPage: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <PreviewManifestEditor />
    </div>
  )
}

export default PreviewManifestsPage
