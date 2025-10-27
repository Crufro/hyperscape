/**
 * Error Detail Modal
 * Shows detailed error information and generates AI fix prompts
 */

import { X, Copy, CheckCircle2, Wand2 } from 'lucide-react'
import React, { useState, useEffect } from 'react'

import { API_ENDPOINTS } from '../../config/api'
import { apiFetch } from '../../utils/api'
import { Button } from '../common/Button'
import { Card } from '../common/Card'
import { Badge } from '../common/Badge'
import { Modal } from '../common/Modal'

interface ErrorDetailModalProps {
  isOpen: boolean
  onClose: () => void
  error: {
    time: string
    method: string
    path: string
    status: string
    message: string
    stack: string
    error_code?: string
    request_body?: unknown
    query_params?: unknown
    headers?: unknown
  }
  errorIndex: number
}

export const ErrorDetailModal: React.FC<ErrorDetailModalProps> = ({
  isOpen,
  onClose,
  error,
  errorIndex
}) => {
  const [aiPrompt, setAiPrompt] = useState<string | null>(null)
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // Fetch AI fix prompt on mount
  useEffect(() => {
    if (isOpen) {
      fetchAIPrompt()
    }
  }, [isOpen, errorIndex])

  const fetchAIPrompt = async () => {
    setIsLoadingPrompt(true)
    try {
      const response = await apiFetch(API_ENDPOINTS.adminLogsErrorFixPrompt(errorIndex))
      const data = await response.json()
      setAiPrompt(data.prompt)
    } catch (err) {
      console.error('[ErrorDetailModal] Failed to fetch AI prompt:', err)
      setAiPrompt(null)
    } finally {
      setIsLoadingPrompt(false)
    }
  }

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const formatJSON = (data: unknown): string => {
    if (!data) return 'N/A'
    if (typeof data === 'string') return data
    return JSON.stringify(data, null, 2)
  }

  return (
    <Modal open={isOpen} onClose={onClose} size="xl">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-text-primary">Error Details</h2>
            <p className="text-sm text-text-tertiary mt-1">
              View error information and get AI-generated fix prompts
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors"
          >
            <X size={20} className="text-text-tertiary" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Error Summary */}
          <Card className="p-4 bg-red-500 bg-opacity-10 border-red-500">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="error">{error.status}</Badge>
                  {error.error_code && <Badge variant="secondary">{error.error_code}</Badge>}
                  <span className="text-xs text-text-tertiary">
                    {new Date(error.time).toLocaleString()}
                  </span>
                </div>
                <div className="text-sm font-medium text-text-primary mb-1">
                  {error.method} {error.path}
                </div>
                <div className="text-sm text-red-400">{error.message}</div>
              </div>
            </div>
          </Card>

          {/* Error Details */}
          <div className="grid grid-cols-2 gap-4">
            {/* Stack Trace */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-text-primary">Stack Trace</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(error.stack, 'stack')}
                  className="flex items-center gap-1"
                >
                  {copiedField === 'stack' ? (
                    <>
                      <CheckCircle2 size={14} />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <div className="bg-bg-tertiary p-3 rounded-lg overflow-x-auto max-h-64">
                <pre className="text-xs text-text-secondary font-mono whitespace-pre-wrap">
                  {error.stack}
                </pre>
              </div>
            </Card>

            {/* Request Details */}
            <Card className="p-4">
              <h3 className="font-semibold text-text-primary mb-2">Request Details</h3>
              <div className="space-y-3">
                {/* Request Body */}
                {error.request_body !== undefined && error.request_body !== null && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs text-text-tertiary">Request Body</div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleCopy(formatJSON(error.request_body), 'request_body')
                        }
                        className="flex items-center gap-1 text-xs"
                      >
                        {copiedField === 'request_body' ? (
                          <>
                            <CheckCircle2 size={12} />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="bg-bg-tertiary p-2 rounded text-xs text-text-secondary font-mono max-h-32 overflow-auto">
                      <pre className="whitespace-pre-wrap">
                        {String(formatJSON(error.request_body))}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Query Params */}
                {error.query_params !== undefined && error.query_params !== null && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs text-text-tertiary">Query Parameters</div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleCopy(formatJSON(error.query_params), 'query_params')
                        }
                        className="flex items-center gap-1 text-xs"
                      >
                        {copiedField === 'query_params' ? (
                          <>
                            <CheckCircle2 size={12} />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="bg-bg-tertiary p-2 rounded text-xs text-text-secondary font-mono">
                      <pre className="whitespace-pre-wrap">
                        {String(formatJSON(error.query_params))}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Headers */}
                {error.headers !== undefined && error.headers !== null && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs text-text-tertiary">Headers</div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(formatJSON(error.headers), 'headers')}
                        className="flex items-center gap-1 text-xs"
                      >
                        {copiedField === 'headers' ? (
                          <>
                            <CheckCircle2 size={12} />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="bg-bg-tertiary p-2 rounded text-xs text-text-secondary font-mono">
                      <pre className="whitespace-pre-wrap">{String(formatJSON(error.headers))}</pre>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* AI Fix Prompt */}
          <Card className="p-6 bg-purple-500 bg-opacity-10 border-purple-500">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wand2 size={20} className="text-purple-400" />
                <h3 className="font-semibold text-text-primary">AI Coding Agent Prompt</h3>
              </div>
              {aiPrompt && (
                <Button
                  variant="primary"
                  onClick={() => handleCopy(aiPrompt, 'aiPrompt')}
                  className="flex items-center gap-2"
                >
                  {copiedField === 'aiPrompt' ? (
                    <>
                      <CheckCircle2 size={16} />
                      Copied to Clipboard!
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      Copy AI Prompt
                    </>
                  )}
                </Button>
              )}
            </div>

            {isLoadingPrompt && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
                <span className="ml-3 text-text-secondary">Generating AI fix prompt...</span>
              </div>
            )}

            {!isLoadingPrompt && aiPrompt && (
              <div>
                <div className="text-sm text-text-tertiary mb-3">
                  Copy this prompt and provide it to your AI coding agent (Claude Code, GitHub
                  Copilot, etc.) to get a fix for this error:
                </div>
                <div className="bg-bg-tertiary p-4 rounded-lg overflow-x-auto max-h-96">
                  <pre className="text-sm text-text-primary font-mono whitespace-pre-wrap">
                    {aiPrompt}
                  </pre>
                </div>
              </div>
            )}

            {!isLoadingPrompt && !aiPrompt && (
              <Card className="p-4 bg-orange-500 bg-opacity-10 border-orange-500">
                <div className="text-sm text-orange-400">
                  Failed to generate AI fix prompt. Try refreshing the logs.
                </div>
              </Card>
            )}
          </Card>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-primary mt-6">
          <Button onClick={onClose} variant="secondary">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}
