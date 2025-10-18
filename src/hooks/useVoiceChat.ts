import { useState, useEffect, useRef } from 'react';
import { ConversationMessage } from '../lib/types';
import { logger } from '../lib/utils/logger';
import { getElevenLabsService } from '../lib/elevenlabs';

interface UseVoiceChatOptions {
  onMessage: (message: ConversationMessage) => void;
  onError: (error: string) => void;
}

export function useVoiceChat({ onMessage, onError }: UseVoiceChatOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [micPermission, setMicPermission] = useState<'requesting' | 'granted' | 'denied' | 'error'>('requesting');

  const recognitionRef = useRef<any>(null);
  const elevenLabsRef = useRef<ReturnType<typeof getElevenLabsService> | null>(null);
  const currentAudioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    try {
      elevenLabsRef.current = getElevenLabsService();
      logger.debug('ElevenLabs service initialized');
    } catch (error) {
      logger.error('Failed to initialize ElevenLabs:', error);
      onError('ElevenLabs service not available. Please check your API key.');
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      logger.error('Speech recognition not supported');
      setMicPermission('error');
      onError('Speech recognition is not supported in your browser');
      return;
    }

    requestMicrophonePermission();

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (currentSourceRef.current) {
        currentSourceRef.current.stop();
      }
      if (currentAudioContextRef.current) {
        currentAudioContextRef.current.close();
      }
    };
  }, []);

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());

      setMicPermission('granted');
      initializeRecognition();
    } catch (error) {
      logger.error('Microphone permission denied', error);
      setMicPermission('denied');
      onError('Microphone access denied');
    }
  };

  const initializeRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      logger.debug('Speech recognition started');
    };

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript.trim();

        if (result.isFinal && transcript) {
          logger.debug('Final speech recognized:', transcript);
          console.log('Final speech recognized:', transcript);

          const userMessage: ConversationMessage = {
            role: 'user',
            content: transcript,
            timestamp: Date.now()
          };

          console.log('Calling onMessage with:', userMessage);
          onMessage(userMessage);
        } else {
          console.log('Interim result:', transcript);
        }
      }
    };

    recognition.onerror = (event: any) => {
      logger.error('Speech recognition error:', event.error);
      console.error('Speech recognition error:', event.error);

      if (event.error === 'no-speech') {
        console.log('No speech detected, continuing to listen...');
      } else if (event.error === 'aborted') {
        setIsListening(false);
      } else {
        setIsListening(false);
        onError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      console.log('Speech recognition ended');
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        logger.debug('Starting speech recognition');
      } catch (error) {
        logger.error('Error starting recognition:', error);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
        logger.debug('Stopping speech recognition');
      } catch (error) {
        logger.error('Error stopping recognition:', error);
      }
    }
  };

  const speak = async (text: string): Promise<void> => {
    if (!elevenLabsRef.current) {
      logger.error('ElevenLabs service not initialized');
      return;
    }

    try {
      if (currentSourceRef.current) {
        currentSourceRef.current.stop();
      }
      if (currentAudioContextRef.current) {
        currentAudioContextRef.current.close();
      }

      setIsSpeaking(true);
      logger.debug('Converting text to speech with ElevenLabs');

      const audioBuffer = await elevenLabsRef.current.textToSpeech(text);
      const audioContext = new AudioContext();
      const source = audioContext.createBufferSource();

      currentAudioContextRef.current = audioContext;
      currentSourceRef.current = source;

      source.buffer = audioBuffer;
      source.connect(audioContext.destination);

      return new Promise((resolve) => {
        source.onended = () => {
          setIsSpeaking(false);
          logger.debug('Finished speaking');
          currentSourceRef.current = null;
          resolve();
        };

        source.start(0);
        logger.debug('Started speaking with ElevenLabs voice');
      });
    } catch (error) {
      logger.error('ElevenLabs TTS error:', error);
      setIsSpeaking(false);
      onError('Failed to play audio. Please try again.');
    }
  };

  const stopSpeaking = () => {
    if (currentSourceRef.current) {
      currentSourceRef.current.stop();
      currentSourceRef.current = null;
    }
    if (currentAudioContextRef.current) {
      currentAudioContextRef.current.close();
      currentAudioContextRef.current = null;
    }
    setIsSpeaking(false);
  };

  return {
    isListening,
    isSpeaking,
    micPermission,
    toggleListening,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    retryPermission: requestMicrophonePermission
  };
}
