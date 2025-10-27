/**
 * Sound Effects Generation Page
 *
 * Generate game sound effects using ElevenLabs text-to-sound-effects API.
 *
 * Features:
 * - Text description input for sound effects
 * - Duration control (0.5-22 seconds or auto)
 * - Prompt influence slider for style control
 * - Category selection with Hyperscape-specific templates
 * - Real-time cost estimation
 * - Instant preview and download
 * - Generation history
 */

import { Volume2, Wand2, Download, Play, Pause, DollarSign, Sparkles, Clock, Info } from 'lucide-react'
import React, { useState, useCallback, useRef, useMemo } from 'react'

import { Badge } from '../components/common/Badge'
import { Button } from '../components/common/Button'
import { Card, CardHeader, CardContent } from '../components/common/Card'
import { RangeInput } from '../components/common/RangeInput'
import { soundEffectsService } from '../services/SoundEffectsService'
import { HYPERSCAPE_SFX_CATEGORIES, type SoundEffectCategory } from '../types/sound-effects'

const MAX_CHARACTERS = 500 // Reasonable limit for SFX descriptions
const MIN_DURATION = 0.5
const MAX_DURATION = 22

interface GeneratedSFX {
  id: string
  text: string
  category?: SoundEffectCategory
  audioBlob: Blob
  duration: number | 'auto'
  size: number
  generatedAt: number
}

export const SoundEffectsPage: React.FC = () => {
  const [inputText, setInputText] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<SoundEffectCategory | null>(null)
  const [durationMode, setDurationMode] = useState<'auto' | 'manual'>('auto')
  const [durationSeconds, setDurationSeconds] = useState<number>(3)
  const [promptInfluence, setPromptInfluence] = useState<number>(0.3)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [generatedSFX, setGeneratedSFX] = useState<GeneratedSFX[]>([])
  const [playingSFXId, setPlayingSFXId] = useState<string | null>(null)

  const currentAudioRef = useRef<HTMLAudioElement | null>(null)

  // Cost estimate
  const costEstimate = useMemo(() => {
    if (durationMode === 'auto') {
      return { duration: 'auto', credits: 100, estimatedCostUSD: '$0.024' }
    }
    const credits = Math.ceil(durationSeconds * 20)
    const costUSD = (credits / 1000 * 0.24).toFixed(3)
    return { duration: durationSeconds, credits, estimatedCostUSD: `$${costUSD}` }
  }, [durationMode, durationSeconds])

  // Character count validation
  const characterCount = inputText.length
  const isOverLimit = characterCount > MAX_CHARACTERS
  const isNearLimit = characterCount > MAX_CHARACTERS * 0.9

  const handleGenerate = useCallback(async () => {
    if (!inputText.trim() || isOverLimit) return

    setIsGenerating(true)
    setError(null)

    try {
      const response = await soundEffectsService.generateSoundEffect({
        text: inputText,
        durationSeconds: durationMode === 'manual' ? durationSeconds : null,
        promptInfluence
      })

      const newSFX: GeneratedSFX = {
        id: Date.now().toString(),
        text: inputText,
        category: selectedCategory ?? undefined,
        audioBlob: response.audioBlob,
        duration: response.duration,
        size: response.size,
        generatedAt: Date.now()
      }

      setGeneratedSFX(prev => [newSFX, ...prev])

      // Auto-play the generated sound
      handlePlaySFX(newSFX)
    } catch (error) {
      console.error('[SoundEffectsPage] Generation failed:', error)
      setError(error instanceof Error ? error.message : 'Failed to generate sound effect')
    } finally {
      setIsGenerating(false)
    }
  }, [inputText, durationMode, durationSeconds, promptInfluence, selectedCategory, isOverLimit])

  const handlePlaySFX = useCallback((sfx: GeneratedSFX) => {
    // Stop current audio if playing
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current = null
    }

    if (playingSFXId === sfx.id) {
      setPlayingSFXId(null)
      return
    }

    setPlayingSFXId(sfx.id)
    const audio = soundEffectsService.playAudioPreview(sfx.audioBlob)
    currentAudioRef.current = audio

    audio.addEventListener('ended', () => {
      setPlayingSFXId(null)
      currentAudioRef.current = null
    })
  }, [playingSFXId])

  const handleDownload = useCallback((sfx: GeneratedSFX) => {
    const filename = `sfx-${sfx.category || 'custom'}-${Date.now()}.mp3`
    soundEffectsService.downloadAudio(sfx.audioBlob, filename)
  }, [])

  const useExample = useCallback((example: string) => {
    setInputText(example)
  }, [])

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-2">
          Sound Effects Generator
        </h1>
        <p className="text-[var(--text-secondary)]">
          Generate custom sound effects for your game using AI
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Generation Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Category Selection */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Sound Category</h2>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {HYPERSCAPE_SFX_CATEGORIES.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(
                      selectedCategory === category.id ? null : category.id
                    )}
                    className={`
                      p-3 rounded-lg border transition-all
                      ${selectedCategory === category.id
                        ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-primary)] hover:border-[var(--color-primary)]'
                      }
                    `}
                  >
                    <div className="font-medium text-sm">{category.label}</div>
                  </button>
                ))}
              </div>

              {/* Category Examples */}
              {selectedCategory && (
                <div className="mt-4 p-4 bg-[var(--bg-tertiary)] rounded-lg">
                  <p className="text-sm font-medium text-[var(--text-primary)] mb-2">
                    {HYPERSCAPE_SFX_CATEGORIES.find(c => c.id === selectedCategory)?.description}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mb-2">Example prompts:</p>
                  <div className="space-y-1">
                    {HYPERSCAPE_SFX_CATEGORIES.find(c => c.id === selectedCategory)?.examples.map((example, idx) => (
                      <button
                        key={idx}
                        onClick={() => useExample(example)}
                        className="block w-full text-left text-xs text-[var(--color-primary)] hover:underline"
                      >
                        "{example}"
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Text Input */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Description</h2>
                <span className={`text-sm ${isOverLimit ? 'text-red-500' : isNearLimit ? 'text-yellow-500' : 'text-[var(--text-muted)]'}`}>
                  {characterCount} / {MAX_CHARACTERS}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Describe the sound effect you want to generate...

Example:
Sword slash through air with metallic ring"
                className={`
                  w-full h-32 p-4 bg-[var(--bg-secondary)] border rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)]
                  focus:outline-none focus:ring-2 resize-none transition-all
                  ${isOverLimit
                    ? 'border-red-500 focus:ring-red-500'
                    : isNearLimit
                      ? 'border-yellow-500 focus:ring-yellow-500'
                      : 'border-[var(--border-primary)] focus:ring-[var(--color-primary)]'
                  }
                `}
                maxLength={MAX_CHARACTERS + 50}
              />
              {isOverLimit && (
                <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                  <Info className="w-4 h-4" />
                  Description exceeds maximum length
                </p>
              )}
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Generation Settings</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Duration Mode */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Duration
                  </label>
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => setDurationMode('auto')}
                      className={`flex-1 py-2 px-4 rounded-lg border transition-all ${
                        durationMode === 'auto'
                          ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                          : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-primary)]'
                      }`}
                    >
                      Auto
                    </button>
                    <button
                      onClick={() => setDurationMode('manual')}
                      className={`flex-1 py-2 px-4 rounded-lg border transition-all ${
                        durationMode === 'manual'
                          ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                          : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-primary)]'
                      }`}
                    >
                      Manual
                    </button>
                  </div>

                  {durationMode === 'manual' && (
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                        Duration: {durationSeconds}s
                      </label>
                      <RangeInput
                        value={durationSeconds}
                        onChange={(e) => setDurationSeconds(parseFloat(e.target.value))}
                        min={MIN_DURATION}
                        max={MAX_DURATION}
                        step={0.5}
                      />
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        0.5 - 22 seconds
                      </p>
                    </div>
                  )}
                </div>

                {/* Prompt Influence */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Prompt Influence: {(promptInfluence * 100).toFixed(0)}%
                  </label>
                  <RangeInput
                    value={promptInfluence}
                    onChange={(e) => setPromptInfluence(parseFloat(e.target.value))}
                    min={0}
                    max={1}
                    step={0.05}
                  />
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Higher values follow the description more closely
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={!inputText.trim() || isOverLimit || isGenerating}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                <span>Generate Sound Effect</span>
              </>
            )}
          </Button>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Cost Estimate */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Cost Estimate
              </h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Duration:</span>
                  <span className="text-[var(--text-primary)] font-medium">
                    {costEstimate.duration === 'auto' ? 'Auto' : `${costEstimate.duration}s`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Credits:</span>
                  <span className="text-[var(--text-primary)] font-medium">{costEstimate.credits}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[var(--border-primary)]">
                  <span className="text-[var(--text-primary)] font-semibold">Cost:</span>
                  <span className="text-[var(--color-primary)] font-bold">{costEstimate.estimatedCostUSD}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Generated SFX History */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Generated ({generatedSFX.length})
              </h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {generatedSFX.length === 0 ? (
                  <p className="text-[var(--text-muted)] text-sm text-center py-4">
                    No sound effects generated yet
                  </p>
                ) : (
                  generatedSFX.map(sfx => (
                    <div
                      key={sfx.id}
                      className="p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]"
                    >
                      {sfx.category && (
                        <Badge variant="primary" className="mb-2">
                          {HYPERSCAPE_SFX_CATEGORIES.find(c => c.id === sfx.category)?.label}
                        </Badge>
                      )}
                      <p className="text-sm text-[var(--text-primary)] mb-2 line-clamp-2">
                        {sfx.text}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-2">
                        <Clock className="w-3 h-3" />
                        <span>{sfx.duration === 'auto' ? 'Auto' : `${sfx.duration}s`}</span>
                        <span>•</span>
                        <span>{(sfx.size / 1024).toFixed(0)} KB</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handlePlaySFX(sfx)}
                          className="flex-1"
                        >
                          {playingSFXId === sfx.id ? (
                            <>
                              <Pause className="w-4 h-4" />
                              <span>Stop</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4" />
                              <span>Play</span>
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownload(sfx)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default SoundEffectsPage
