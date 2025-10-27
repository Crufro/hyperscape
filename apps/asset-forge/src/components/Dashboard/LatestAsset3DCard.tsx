/**
 * Latest Asset 3D Card
 *
 * Shows the most recently generated 3D asset with an interactive 3D viewer
 */

import React, { useState, useEffect } from 'react'
import { Box, ExternalLink, Clock, Sparkles } from 'lucide-react'
import { SafeThreeViewer } from '../shared/SafeThreeViewer'
import { useAssetsStore } from '../../stores/useAssetsStore'
import { useNavigationStore } from '../../stores/useNavigationStore'
import { formatDistanceToNow } from '../../utils/dateUtils'
import { ROUTES } from '../../constants/routes'

export function LatestAsset3DCard() {
  const selectedAsset = useAssetsStore(state => state.selectedAsset)
  const navigateTo = useNavigationStore(state => state.navigateTo)
  const latestAsset = selectedAsset

  if (!latestAsset) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Box className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-white">Latest 3D Asset</h2>
        </div>
        <div className="text-center py-12 text-text-secondary">
          <Box className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No assets generated yet</p>
          <p className="text-sm mt-2">Create your first 3D asset to see it here</p>
          <button
            onClick={() => navigateTo(ROUTES.GENERATION)}
            className="mt-4 px-4 py-2 bg-primary/20 hover:bg-primary/30 border border-primary/30 rounded-lg text-sm text-primary-light transition-colors inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Generate 3D Asset
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card-hover overflow-hidden">
      {/* Header */}
      <div className="panel-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Box className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold text-white">Latest 3D Asset</h2>
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <Clock className="w-3 h-3" />
              <span>{formatDistanceToNow(new Date(latestAsset.generatedAt))}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateTo(ROUTES.GENERATION)}
            className="px-3 py-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/30 text-xs text-primary-light transition-colors inline-flex items-center gap-1.5"
            title="Generate new asset"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Generate
          </button>
          <button
            onClick={() => navigateTo(ROUTES.ASSETS)}
            className="p-2 rounded-lg hover:bg-bg-hover transition-colors group"
            title="View all assets"
          >
            <ExternalLink className="w-4 h-4 text-text-secondary group-hover:text-white" />
          </button>
        </div>
      </div>

      {/* 3D Viewer */}
      <div className="aspect-video bg-bg-primary">
        <SafeThreeViewer
          modelUrl={latestAsset.modelFile}
        />
      </div>

      {/* Asset Info */}
      <div className="panel-body space-y-3">
        <div>
          <h3 className="font-semibold text-white mb-1">{latestAsset.name}</h3>
          {latestAsset.description && (
            <p className="text-sm text-text-secondary line-clamp-2">{latestAsset.description}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {latestAsset.type && (
            <span className="px-2 py-1 text-xs rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {latestAsset.type}
            </span>
          )}
          {latestAsset.hasModel && (
            <span className="px-2 py-1 text-xs rounded-full bg-gray-500/20 text-gray-300 border border-gray-500/30">
              3D Model
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
