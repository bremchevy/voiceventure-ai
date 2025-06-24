'use client';

import { useState, useCallback } from 'react';
import { ContentGenerator } from '@/components/ContentGenerator';

export default function GeneratePage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  const handleGenerate = useCallback(async (options: any) => {
    setIsGenerating(true);
    setStreamingContent('');

    try {
      const response = await fetch(`/api/generate/${options.subject}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        throw new Error('Generation failed');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          setStreamingContent(prev => prev + chunk);
        }
      }
    } catch (error) {
      console.error('Error generating content:', error);
      setStreamingContent('Error generating content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <ContentGenerator
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
        streamingContent={streamingContent}
      />
    </div>
  );
} 