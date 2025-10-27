/**
 * HighlightText Component
 *
 * Highlights matching search terms within text.
 * Uses exact match highlighting with customizable styling.
 */

import React from 'react'

interface HighlightTextProps {
  text: string
  query: string
  className?: string
  highlightClassName?: string
}

export const HighlightText: React.FC<HighlightTextProps> = ({
  text,
  query,
  className = '',
  highlightClassName = 'bg-yellow-500/30 text-yellow-200 font-semibold'
}) => {
  if (!query || !text) {
    return <span className={className}>{text}</span>
  }

  // Escape special regex characters in query
  const escapeRegex = (str: string) => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  // Create case-insensitive regex to find all matches
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi')
  const parts = text.split(regex)

  return (
    <span className={className}>
      {parts.map((part, index) => {
        const isMatch = part.toLowerCase() === query.toLowerCase()
        return isMatch ? (
          <mark
            key={index}
            className={`${highlightClassName} rounded px-0.5`}
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        )
      })}
    </span>
  )
}
