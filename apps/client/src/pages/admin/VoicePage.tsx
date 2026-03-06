import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTextQuery } from '@/hooks/useVoice'
import { useLanguageStore } from '@/stores/appStore'

export default function VoicePage() {
  const { t, i18n } = useTranslation()
  const language = useLanguageStore((state) => state.language)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const textQueryMutation = useTextQuery()

  const processQuery = async (query: string) => {
    try {
      const result = await textQueryMutation.mutateAsync(query)
      setTranscript(query)
    } catch (error) {
      console.error('Query failed:', error)
    }
  }

  const toggleListening = () => {
    setListening(!listening)
    // Mock voice recognition - in production, integrate with Web Speech API
    if (!listening) {
      setTimeout(() => {
        const mockQuery = 'What are my low stock items?'
        processQuery(mockQuery)
        setListening(false)
      }, 2000)
    }
  }

  const handleExampleClick = (example: string) => {
    processQuery(example)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold">{t('voice.title')}</h1>
        <p className="text-gray-500 mt-1">Ask questions about your business</p>
      </div>

      {/* Voice Interface */}
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-6">
            <button
              onClick={toggleListening}
              className={`h-32 w-32 rounded-full flex items-center justify-center transition-all ${
                listening
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                  : 'bg-primary hover:bg-primary/90'
              }`}
            >
              {listening ? (
                <MicOff className="h-16 w-16 text-white" />
              ) : (
                <Mic className="h-16 w-16 text-white" />
              )}
            </button>

            <p className="text-lg font-medium">
              {listening ? t('voice.listening') : t('voice.startListening')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Transcript */}
      {transcript && (
        <Card>
          <CardHeader>
            <CardTitle>{t('voice.transcript')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg">{transcript}</p>
          </CardContent>
        </Card>
      )}

      {/* Response */}
      {textQueryMutation.isPending && (
        <Card>
          <CardContent className="py-12 flex items-center justify-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p>{t('common.loading')}</p>
          </CardContent>
        </Card>
      )}
      
      {textQueryMutation.data && (
        <Card>
          <CardHeader>
            <CardTitle>{t('voice.response')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg">
              {language === 'si' ? textQueryMutation.data.responseSi : textQueryMutation.data.response}
            </p>
            {textQueryMutation.data.suggestedActions && textQueryMutation.data.suggestedActions.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-semibold mb-2">Suggested Actions:</p>
                <div className="flex flex-wrap gap-2">
                  {textQueryMutation.data.suggestedActions.map((action, i) => (
                    <Button key={i} variant="outline" size="sm">
                      {action}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {textQueryMutation.isError && (
        <Card className="border-red-200">
          <CardContent className="py-6">
            <p className="text-red-600">Error processing your query. Please try again.</p>
          </CardContent>
        </Card>
      )}

      {/* Examples */}
      <Card>
        <CardHeader>
          <CardTitle>{t('voice.examples')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              'What are my top selling products?',
              'Show me low stock items',
              'What is the sales forecast for next week?',
              'How many orders did we get today?',
            ].map((example, index) => (
              <button
                key={index}
                onClick={() => handleExampleClick(example)}
                className="w-full text-left p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
