/**
 * Latest Asset 3D Card
 *
 * Shows the most recently generated 3D asset with an interactive 3D viewer
 */

import React, { useState, useEffect } from 'react'
import { Box, ExternalLink, Clock } from 'lucide-react'
import { SafeThreeViewer } from '../shared/SafeThreeViewer'
import { useAssetsStore } from '../../stores/useAssetsStore'
import { formatDistanceToNow } from '../../utils/dateUtils'

export function LatestAsset3DCard() {
  const assets = useAssetsStore(state => state.assets)
  const latestAsset = assets && assets.length > 0 ? assets[0] : null

  if (!latestAsset) {
    return (
      <div className="bg-bg-secondary/40 backdrop-blur-sm border border-border-primary/30 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Box className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-white">Latest 3D Asset</h2>
        </div>
        <div className="text-center py-12 text-gray-400">
          <Box className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No assets generated yet</p>
          <p className="text-sm mt-2">Create your first 3D asset to see it here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-bg-secondary/40 backdrop-blur-sm border border-border-primary/30 rounded-lg overflow-hidden hover:border-border-primary/60 transition-colors">
      {/* Header */}
      <div className="p-4 border-b border-border-primary/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Box className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold text-white">Latest 3D Asset</h2>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              <span>{formatDistanceToNow(latestAsset.createdAt || new Date())}</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => window.location.href = '/assets'}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors group"
          title="View all assets"
        >
          <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-white" />
        </button>
      </div>

      {/* 3D Viewer */}
      <div className="aspect-video bg-black/20">
        <SafeThreeViewer
          modelUrl={latestAsset.modelUrl}
          textureUrl={latestAsset.textureUrl}
          initialCameraPosition={[0, 1, 3]}
        />
      </div>

      {/* Asset Info */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-white mb-1">{latestAsset.name}</h3>
          {latestAsset.description && (
            <p className="text-sm text-gray-400 line-clamp-2">{latestAsset.description}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {latestAsset.assetType && (
            <span className="px-2 py-1 text-xs rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {latestAsset.assetType}
            </span>
          )}
          {latestAsset.style && (
            <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              {latestAsset.style}
            </span>
          )}
          {latestAsset.polyCount && (
            <span className="px-2 py-1 text-xs rounded-full bg-gray-500/20 text-gray-300 border border-gray-500/30">
              {latestAsset.polyCount.toLocaleString()} polys
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
