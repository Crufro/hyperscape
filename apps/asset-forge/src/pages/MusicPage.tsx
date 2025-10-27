/**
 * Music Generation Page
 *
 * Generate game music using ElevenLabs music generation API.
 *
 * Features:
 * - Text prompt input for music generation
 * - Length control (10-300 seconds)
 * - Instrumental/vocal toggle
 * - Composition plan support
 * - Real-time preview and download
 * - Generation history
 */

import { Music, Wand2, Download, Play, Pause, Clock, Info, FileText } from 'lucide-react'
import React, { useState, useCallback, useRef } from 'react'

import { Badge } from '../components/common/Badge'
import { Button } from '../components/common/Button'
import { Card, CardHeader, CardContent } from '../components/common/Card'
import { RangeInput } from '../components/common/RangeInput'
import { musicService } from '../services/MusicService'

const MAX_CHARACTERS = 500
const MIN_DURATION = 10
const MAX_DURATION = 300

interface GeneratedMusic {
  id: string
  prompt: string
  audioBlob: Blob
  duration: number
  size: number
  generatedAt: number
  isInstrumental: boolean
}

export const MusicPage: React.FC = () => {
  const [inputPrompt, setInputPrompt] = useState('')
  const [durationSeconds, setDurationSeconds] = useState<number>(30)
  const [forceInstrumental, setForceInstrumental] = useState<boolean>(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [generatedMusic, setGeneratedMusic] = useState<GeneratedMusic[]>([])
  const [playingMusicId, setPlayingMusicId] = useState<string | null>(null)

  const currentAudioRef = useRef<HTMLAudioElement | null>(null)

  // Character count validation
  const characterCount = inputPrompt.length
  const isOverLimit = characterCount > MAX_CHARACTERS
  const isNearLimit = characterCount > MAX_CHARACTERS * 0.9

  const handleGenerate = useCallback(async () => {
    if (!inputPrompt.trim() || isOverLimit) return

    setIsGenerating(true)
    setError(null)

    try {
      const response = await musicService.generateMusic({
        prompt: inputPrompt,
        musicLengthMs: durationSeconds * 1000,
        forceInstrumental
      })

      const newMusic: GeneratedMusic = {
        id: Date.now().toString(),
        prompt: inputPrompt,
        audioBlob: response.audioBlob,
        duration: durationSeconds,
        size: response.size,
        generatedAt: Date.now(),
        isInstrumental: forceInstrumental
      }

      setGeneratedMusic(prev => [newMusic, ...prev])

      // Auto-play the generated music
      handlePlayMusic(newMusic)
    } catch (error) {
      console.error('[MusicPage] Generation failed:', error)
      setError(error instanceof Error ? error.message : 'Failed to generate music')
    } finally {
      setIsGenerating(false)
    }
  }, [inputPrompt, durationSeconds, forceInstrumental, isOverLimit])

  const handlePlayMusic = useCallback((music: GeneratedMusic) => {
    // Stop current audio if playing
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current = null
    }

    if (playingMusicId === music.id) {
      setPlayingMusicId(null)
      return
    }

    setPlayingMusicId(music.id)
    const audioUrl = musicService.createAudioUrl(music.audioBlob)
    const audio = new Audio(audioUrl)
    currentAudioRef.current = audio

    audio.play().catch(err => {
      console.error('Failed to play audio:', err)
      setPlayingMusicId(null)
    })

    audio.addEventListener('ended', () => {
      setPlayingMusicId(null)
      currentAudioRef.current = null
      musicService.revokeAudioUrl(audioUrl)
    })
  }, [playingMusicId])

  const handleDownload = useCallback((music: GeneratedMusic) => {
    const filename = `music-${music.isInstrumental ? 'instrumental' : 'vocal'}-${Date.now()}.mp3`
    musicService.downloadAudio(music.audioBlob, filename)
  }, [])

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2">
          <Music className="w-8 h-8" />
          Music Generator
        </h1>
        <p className="text-[var(--text-secondary)]">
          Generate custom background music and soundtracks for your game using AI
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Generation Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Music Type */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Music Type</h2>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <button
                  onClick={() => setForceInstrumental(true)}
                  className={`flex-1 py-3 px-4 rounded-lg border transition-all ${
                    forceInstrumental
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-primary)] hover:border-[var(--color-primary)]'
                  }`}
                >
                  <div className="font-medium">Instrumental</div>
                  <div className="text-xs opacity-80">No vocals</div>
                </button>
                <button
                  onClick={() => setForceInstrumental(false)}
                  className={`flex-1 py-3 px-4 rounded-lg border transition-all ${
                    !forceInstrumental
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-primary)] hover:border-[var(--color-primary)]'
                  }`}
                >
                  <div className="font-medium">With Vocals</div>
                  <div className="text-xs opacity-80">May include singing</div>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Prompt Input */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Music Description</h2>
                <span className={`text-sm ${isOverLimit ? 'text-red-500' : isNearLimit ? 'text-yellow-500' : 'text-[var(--text-muted)]'}`}>
                  {characterCount} / {MAX_CHARACTERS}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <textarea
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="Describe the music you want to generate...

Examples:
- Epic orchestral battle theme with heavy drums and brass
- Calm ambient forest music with flutes and strings
- Upbeat tavern music with medieval instruments
- Dark dungeon atmosphere with low synths and echoes"
                className={`
                  w-full h-40 p-4 bg-[var(--bg-secondary)] border rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)]
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
                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Duration: {durationSeconds}s ({Math.floor(durationSeconds / 60)}:{(durationSeconds % 60).toString().padStart(2, '0')})
                  </label>
                  <RangeInput
                    value={durationSeconds}
                    onChange={(e) => setDurationSeconds(parseFloat(e.target.value))}
                    min={MIN_DURATION}
                    max={MAX_DURATION}
                    step={5}
                  />
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {MIN_DURATION} - {MAX_DURATION} seconds (10 seconds - 5 minutes)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={!inputPrompt.trim() || isOverLimit || isGenerating}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generating Music... (this may take a minute)</span>
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                <span>Generate Music</span>
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
          {/* Info Card */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <Info className="w-5 h-5" />
                About Music Generation
              </h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-[var(--text-secondary)]">
                <p>
                  Generate unique music tracks for your game using ElevenLabs AI music generation.
                </p>
                <p>
                  <strong>Tips:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Be specific about mood and instruments</li>
                  <li>Mention genre (orchestral, ambient, rock, etc.)</li>
                  <li>Describe the tempo and energy level</li>
                  <li>Generation takes 30-60 seconds</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Generated Music History */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Generated ({generatedMusic.length})
              </h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {generatedMusic.length === 0 ? (
                  <p className="text-[var(--text-muted)] text-sm text-center py-4">
                    No music generated yet
                  </p>
                ) : (
                  generatedMusic.map(music => (
                    <div
                      key={music.id}
                      className="p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]"
                    >
                      <Badge variant="primary" className="mb-2">
                        {music.isInstrumental ? 'Instrumental' : 'With Vocals'}
                      </Badge>
                      <p className="text-sm text-[var(--text-primary)] mb-2 line-clamp-2">
                        {music.prompt}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-2">
                        <Clock className="w-3 h-3" />
                        <span>{music.duration}s ({Math.floor(music.duration / 60)}:{(music.duration % 60).toString().padStart(2, '0')})</span>
                        <span>•</span>
                        <span>{(music.size / 1024 / 1024).toFixed(1)} MB</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handlePlayMusic(music)}
                          className="flex-1"
                        >
                          {playingMusicId === music.id ? (
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
                          onClick={() => handleDownload(music)}
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

export default MusicPage
