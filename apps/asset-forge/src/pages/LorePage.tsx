/**
 * Lore Page
 *
 * Dedicated page for lore creation and management.
 * Includes lore generator, lore entry browser with category filters,
 * and related entity links.
 */

import React, { useState } from 'react'
import { BookOpen, Download, Search } from 'lucide-react'
import { LoreGenerator } from '../components/GameContent/LoreGenerator'
import { useContentGenerationStore } from '../stores/useContentGenerationStore'
import { useGenerationStore } from '../stores/useGenerationStore'
import type { LoreEntry } from '../types/content-generation'
import { Button } from '../components/common/Button'
import { Card, ProjectSelector } from '../components/common'
import { Badge } from '../components/common/Badge'
import { Input } from '../components/common/Input'

export function LorePage() {
  const { lore, addLore } = useContentGenerationStore()
  const [selectedCategory, setSelectedCategory] = useState<LoreEntry['category'] | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Project Context
  const selectedProjectId = useGenerationStore(state => state.selectedProjectId)
  const setSelectedProject = useGenerationStore(state => state.setSelectedProject)

  const categories: Array<{ value: LoreEntry['category'] | 'all'; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'history', label: 'History' },
    { value: 'faction', label: 'Faction' },
    { value: 'character', label: 'Character' },
    { value: 'location', label: 'Location' },
    { value: 'artifact', label: 'Artifact' },
    { value: 'event', label: 'Event' },
  ]

  const handleLoreGenerated = (entry: LoreEntry) => {
    addLore(entry)
  }

  const handleExportLore = () => {
    const dataStr = JSON.stringify(lore, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
    const exportFileDefaultName = `lore-${Date.now()}.json`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const filteredLore = lore.filter((entry) => {
    const matchesCategory = selectedCategory === 'all' || entry.category === selectedCategory
    const matchesSearch = searchQuery === '' ||
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const getCategoryCount = (category: LoreEntry['category'] | 'all') => {
    if (category === 'all') return lore.length
    return lore.filter((entry) => entry.category === category).length
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="border-b border-border-primary/30 bg-bg-secondary/40 backdrop-blur-sm -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Lore</h1>
              <p className="text-sm text-gray-400">Create and manage world lore with AI assistance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{lore.length} entries</Badge>
            {lore.length > 0 && (
              <Button onClick={handleExportLore} size="sm" variant="secondary">
                <Download size={14} className="mr-1" />
                Export All
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Project Selector */}
      <Card className="mb-6">
        <div className="p-4">
          <ProjectSelector
            selectedProjectId={selectedProjectId}
            onSelect={setSelectedProject}
            showUnassigned={true}
          />
        </div>
      </Card>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Lore Generator */}
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-4">Create Lore Entry</h2>
          <LoreGenerator onLoreGenerated={handleLoreGenerated} />
        </div>

        {/* Lore Browser */}
        {lore.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-4">Lore Library</h2>

            {/* Category Filters */}
            <div className="flex flex-wrap gap-2 mb-4">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`px-4 py-2 rounded-lg text-sm transition-all ${
                    selectedCategory === cat.value
                      ? 'bg-primary text-white'
                      : 'bg-bg-secondary text-text-secondary border border-border-primary hover:border-primary'
                  }`}
                >
                  {cat.label}
                  {getCategoryCount(cat.value) > 0 && (
                    <span className="ml-2 opacity-70">({getCategoryCount(cat.value)})</span>
                  )}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary" size={16} />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search lore entries..."
                  className="pl-10"
                />
              </div>
            </div>

            {/* Lore Entries */}
            <div className="space-y-4">
              {filteredLore.map((entry) => (
                <Card key={entry.id} className="p-6 hover:border-primary/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-text-primary">{entry.title}</h3>
                        <Badge variant="secondary">{entry.category}</Badge>
                      </div>
                      <p className="text-sm text-text-secondary whitespace-pre-line">{entry.content}</p>
                    </div>
                  </div>

                  {/* Tags */}
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {entry.tags.map((tag, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Related Entities */}
                  {entry.relatedEntities && entry.relatedEntities.length > 0 && (
                    <div className="pt-3 border-t border-border-primary/30">
                      <div className="text-xs text-text-tertiary mb-2">Related Entities:</div>
                      <div className="flex flex-wrap gap-2">
                        {entry.relatedEntities.map((entity) => (
                          <Badge key={entity.id} variant="secondary" className="text-xs">
                            {entity.type}: {entity.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  {entry.createdAt && (
                    <div className="mt-3 text-xs text-text-tertiary">
                      Created: {new Date(entry.createdAt).toLocaleDateString()}
                    </div>
                  )}
                </Card>
              ))}

              {filteredLore.length === 0 && (
                <Card className="p-12 text-center">
                  <BookOpen size={48} className="mx-auto text-text-tertiary mb-4" />
                  <h3 className="text-lg font-semibold text-text-primary mb-2">No Matching Lore</h3>
                  <p className="text-sm text-text-secondary">
                    {searchQuery
                      ? 'Try a different search term'
                      : 'No lore entries in this category'}
                  </p>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {lore.length === 0 && (
          <Card className="p-12 text-center">
            <BookOpen size={48} className="mx-auto text-text-tertiary mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">No Lore Entries</h3>
            <p className="text-sm text-text-secondary">
              Use the lore generator above to create your first lore entry
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}

export default LorePage
