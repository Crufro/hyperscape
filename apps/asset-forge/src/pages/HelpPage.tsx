/**
 * Help Page
 * Documentation, guides, and support resources
 */

import { HelpCircle, BookOpen, Keyboard, MessageSquare, ExternalLink, Search, Sparkles, Database, Wand2, Mail, FileText, Video, Zap, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Badge } from '@/components/common'
import { useNavigationStore } from '@/stores/useNavigationStore'

interface KeyboardShortcut {
  keys: string[]
  description: string
  category: string
}

interface HelpArticle {
  id: string
  title: string
  description: string
  category: string
  icon: any
}

export function HelpPage() {
  const navigateTo = useNavigationStore(state => state.navigateTo)
  const [searchQuery, setSearchQuery] = useState('')

  const keyboardShortcuts: KeyboardShortcut[] = [
    // Navigation
    { keys: ['g'], description: 'Go to Generate page', category: 'Navigation' },
    { keys: ['a'], description: 'Go to Assets page', category: 'Navigation' },
    { keys: ['Cmd/Ctrl', 'k'], description: 'Open global search', category: 'Navigation' },
    { keys: ['/'], description: 'Focus search', category: 'Navigation' },
    { keys: ['?'], description: 'Show keyboard shortcuts', category: 'Navigation' },
    { keys: [','], description: 'Open settings', category: 'Navigation' },

    // Asset Viewer
    { keys: ['d'], description: 'Toggle details panel', category: 'Asset Viewer' },
    { keys: ['w'], description: 'Toggle wireframe mode', category: 'Asset Viewer' },
    { keys: ['r'], description: 'Reset camera view', category: 'Asset Viewer' },
    { keys: ['Space'], description: 'Toggle animation playback', category: 'Asset Viewer' },

    // General
    { keys: ['Cmd/Ctrl', 's'], description: 'Save current work', category: 'General' },
    { keys: ['Cmd/Ctrl', 'z'], description: 'Undo', category: 'General' },
    { keys: ['Cmd/Ctrl', 'Shift', 'z'], description: 'Redo', category: 'General' },
    { keys: ['Esc'], description: 'Close modal/panel', category: 'General' },
  ]

  const helpArticles: HelpArticle[] = [
    {
      id: 'getting-started',
      title: 'Getting Started with Asset Forge',
      description: 'Learn the basics of creating and managing 3D assets',
      category: 'Getting Started',
      icon: Sparkles
    },
    {
      id: 'generating-assets',
      title: 'Generating 3D Assets with AI',
      description: 'Master the art of AI-powered asset generation',
      category: 'Asset Creation',
      icon: Wand2
    },
    {
      id: 'asset-library',
      title: 'Managing Your Asset Library',
      description: 'Organize, search, and manage your 3D assets',
      category: 'Asset Management',
      icon: Database
    },
    {
      id: 'rigging-tools',
      title: 'Using Hand Rigging & Armor Fitting',
      description: 'Guide to specialized 3D model rigging tools',
      category: 'Tools',
      icon: Zap
    },
    {
      id: 'voice-generation',
      title: 'Voice Generation & Dialogue',
      description: 'Create AI-powered voice content for NPCs',
      category: 'Content Creation',
      icon: MessageSquare
    },
    {
      id: 'keyboard-shortcuts',
      title: 'Keyboard Shortcuts Reference',
      description: 'Complete list of keyboard shortcuts',
      category: 'Reference',
      icon: Keyboard
    }
  ]

  const faqs = [
    {
      question: 'How do I generate a new 3D asset?',
      answer: 'Navigate to the Generate page using the sidebar or press "g". Enter a text prompt describing your asset and click "Generate". The AI will create a 3D model based on your description.'
    },
    {
      question: 'What file formats are supported?',
      answer: 'Asset Forge supports GLB, FBX, and OBJ formats for 3D models. Generated assets are typically in GLB format, which is optimized for web viewing.'
    },
    {
      question: 'How do I export my assets?',
      answer: 'Select an asset in your library, then click the download button in the viewer controls. You can export individual assets or use bulk export for multiple assets.'
    },
    {
      question: 'Can I edit assets after generation?',
      answer: 'Yes! Use the retexture feature to change materials, or the regenerate feature to create variations. You can also download assets and edit them in external 3D software.'
    },
    {
      question: 'How does the voice generation work?',
      answer: 'Navigate to the Voice Generation section to create AI-powered voice content. You can assign voices to NPCs, generate dialogue, and create voice packs for your game content.'
    },
    {
      question: 'What are the keyboard shortcuts?',
      answer: 'Press "?" anywhere in the app to view all keyboard shortcuts. Common shortcuts include "g" for Generate, "a" for Assets, and "Cmd/Ctrl+K" for global search.'
    }
  ]

  const filteredArticles = helpArticles.filter(article =>
    searchQuery === '' ||
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const shortcutCategories = Array.from(new Set(keyboardShortcuts.map(s => s.category)))

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <div className="bg-bg-secondary border-b border-border-primary backdrop-blur-md">
        <div className="max-w-[1200px] mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 backdrop-blur-sm">
              <HelpCircle className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-text-primary">Help & Documentation</h1>
              <p className="text-text-secondary mt-1">Find guides, tutorials, and answers to common questions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-6">
        {/* Search */}
        <Card className="bg-bg-secondary border-border-primary backdrop-blur-md">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-tertiary" />
              <Input
                type="text"
                placeholder="Search help articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-bg-tertiary border-border-primary text-text-primary placeholder:text-text-tertiary"
              />
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-bg-secondary border-border-primary backdrop-blur-md hover:border-primary/50 transition-all cursor-pointer">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">Documentation</h3>
                <p className="text-sm text-text-secondary">Comprehensive guides and tutorials</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-bg-secondary border-border-primary backdrop-blur-md hover:border-primary/50 transition-all cursor-pointer">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20">
                  <Video className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">Video Tutorials</h3>
                <p className="text-sm text-text-secondary">Step-by-step video guides</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-bg-secondary border-border-primary backdrop-blur-md hover:border-primary/50 transition-all cursor-pointer">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20">
                  <MessageSquare className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">Community</h3>
                <p className="text-sm text-text-secondary">Join our Discord community</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Help Articles */}
        <Card className="bg-bg-secondary border-border-primary backdrop-blur-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <CardTitle>Help Articles</CardTitle>
            </div>
            <CardDescription>Browse guides and tutorials by topic</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredArticles.length === 0 ? (
              <p className="text-center py-8 text-text-secondary">No articles found matching "{searchQuery}"</p>
            ) : (
              filteredArticles.map(article => {
                const Icon = article.icon
                return (
                  <div
                    key={article.id}
                    className="flex items-center justify-between p-4 bg-bg-tertiary rounded-lg border border-border-primary hover:border-primary/50 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-text-primary group-hover:text-primary transition-colors">{article.title}</h4>
                        <p className="text-xs text-text-secondary mt-1">{article.description}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">{article.category}</Badge>
                    </div>
                    <ChevronRight className="w-5 h-5 text-text-tertiary group-hover:text-primary transition-colors ml-4" />
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Keyboard Shortcuts */}
        <Card className="bg-bg-secondary border-border-primary backdrop-blur-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-primary" />
              <CardTitle>Keyboard Shortcuts</CardTitle>
            </div>
            <CardDescription>Speed up your workflow with keyboard shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {shortcutCategories.map(category => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 bg-primary rounded"></div>
                  {category}
                </h3>
                <div className="space-y-2">
                  {keyboardShortcuts
                    .filter(shortcut => shortcut.category === category)
                    .map((shortcut, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg border border-border-primary"
                      >
                        <span className="text-sm text-text-secondary">{shortcut.description}</span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, i) => (
                            <span key={i} className="flex items-center gap-1">
                              <kbd className="px-2 py-1 bg-bg-primary rounded border border-border-primary text-text-primary font-mono text-xs">
                                {key}
                              </kbd>
                              {i < shortcut.keys.length - 1 && (
                                <span className="text-text-tertiary text-xs">+</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card className="bg-bg-secondary border-border-primary backdrop-blur-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              <CardTitle>Frequently Asked Questions</CardTitle>
            </div>
            <CardDescription>Quick answers to common questions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="p-4 bg-bg-tertiary rounded-lg border border-border-primary">
                <h4 className="text-sm font-semibold text-text-primary mb-2">{faq.question}</h4>
                <p className="text-sm text-text-secondary leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Support */}
        <Card className="bg-bg-secondary border-border-primary backdrop-blur-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              <CardTitle>Need More Help?</CardTitle>
            </div>
            <CardDescription>Get in touch with our support team</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-bg-tertiary rounded-lg border border-border-primary">
              <Mail className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-text-primary mb-1">Email Support</h4>
                <p className="text-sm text-text-secondary mb-2">Get help from our support team</p>
                <a href="mailto:support@assetforge.com" className="text-sm text-primary hover:underline">
                  support@assetforge.com
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-bg-tertiary rounded-lg border border-border-primary">
              <MessageSquare className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-text-primary mb-1">Community Discord</h4>
                <p className="text-sm text-text-secondary mb-3">Join our community for discussions and support</p>
                <Button variant="ghost" size="sm" className="gap-2">
                  Join Discord
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-bg-tertiary rounded-lg border border-border-primary">
              <FileText className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-text-primary mb-1">Documentation</h4>
                <p className="text-sm text-text-secondary mb-3">Read our comprehensive documentation</p>
                <Button variant="ghost" size="sm" className="gap-2">
                  View Docs
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
