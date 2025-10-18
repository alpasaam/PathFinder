import { useState, useEffect, useRef } from 'react';
import { ConversationMessage } from '../lib/types';
import { logger } from '../lib/utils/logger';

interface UseVoiceChatOptions {
  onMessage: (message: ConversationMessage) => void;
  onError: (error: string) => void;
}

export function useVoiceChat({ onMessage, onError }: UseVoiceChatOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [micPermission, setMicPermission] = useState<'requesting' | 'granted' | 'denied' | 'error'>('requesting');

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;

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
      if (synthRef.current) {
        synthRef.current.cancel();
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

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      logger.debug('Speech recognition started');
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      logger.debug('Recognized speech:', transcript);
      console.log('Speech recognized:', transcript);

      const userMessage: ConversationMessage = {
        role: 'user',
        content: transcript,
        timestamp: Date.now()
      };

      console.log('Calling onMessage with:', userMessage);
      onMessage(userMessage);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      logger.error('Speech recognition error:', event.error);
      console.error('Speech recognition error:', event.error);
      setIsListening(false);

      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        onError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      console.log('Speech recognition ended');
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        logger.error('Error starting recognition:', error);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const speak = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!synthRef.current) {
        resolve();
        return;
      }

      synthRef.current.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        setIsSpeaking(true);
        logger.debug('Started speaking');
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        logger.debug('Finished speaking');
        resolve();
      };

      utterance.onerror = (event) => {
        logger.error('Speech synthesis error:', event);
        setIsSpeaking(false);
        resolve();
      };

      synthRef.current.speak(utterance);
    });
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  return {
    isListening,
    isSpeaking,
    micPermission,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    retryPermission: requestMicrophonePermission
  };
}
