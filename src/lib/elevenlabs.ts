import { logger } from './utils/logger';

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

const DEFAULT_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Sarah - warm, conversational voice
const DEFAULT_MODEL_ID = 'eleven_turbo_v2_5';

export interface ElevenLabsConfig {
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

export class ElevenLabsService {
  private apiKey: string;
  private config: Required<ElevenLabsConfig>;

  constructor(apiKey?: string, config?: ElevenLabsConfig) {
    this.apiKey = apiKey || ELEVENLABS_API_KEY;

    if (!this.apiKey) {
      throw new Error('ElevenLabs API key is required');
    }

    this.config = {
      voiceId: config?.voiceId || DEFAULT_VOICE_ID,
      modelId: config?.modelId || DEFAULT_MODEL_ID,
      stability: config?.stability ?? 0.5,
      similarityBoost: config?.similarityBoost ?? 0.75,
      style: config?.style ?? 0.0,
      useSpeakerBoost: config?.useSpeakerBoost ?? true,
    };
  }

  async textToSpeech(text: string): Promise<AudioBuffer> {
    try {
      logger.debug('Converting text to speech with ElevenLabs:', text.substring(0, 50));

      if (!this.apiKey || this.apiKey === 'your_elevenlabs_api_key') {
        throw new Error('ElevenLabs API key not configured. Please set VITE_ELEVENLABS_API_KEY in your .env file.');
      }

      const response = await fetch(
        `${ELEVENLABS_API_URL}/text-to-speech/${this.config.voiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey,
          },
          body: JSON.stringify({
            text,
            model_id: this.config.modelId,
            voice_settings: {
              stability: this.config.stability,
              similarity_boost: this.config.similarityBoost,
              style: this.config.style,
              use_speaker_boost: this.config.useSpeakerBoost,
            },
          }),
        }
      );

      if (!response.ok) {
        let errorText = '';
        try {
          const errorJson = await response.json();
          errorText = JSON.stringify(errorJson);
        } catch {
          errorText = await response.text();
        }

        const errorMessage = `ElevenLabs API error (${response.status}): ${errorText}`;
        logger.error(errorMessage);
        throw new Error(errorMessage);
      }

      const audioData = await response.arrayBuffer();

      if (audioData.byteLength === 0) {
        throw new Error('ElevenLabs returned empty audio data');
      }

      logger.debug(`Received audio data: ${audioData.byteLength} bytes`);

      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(audioData);

      logger.debug('Successfully converted text to speech');
      return audioBuffer;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('ElevenLabs TTS error:', errorMessage);
      throw new Error(`Failed to convert text to speech: ${errorMessage}`);
    }
  }

  async speak(text: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        logger.debug('Starting speech synthesis for text:', text.substring(0, 50));
        const audioBuffer = await this.textToSpeech(text);
        const audioContext = new AudioContext();
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);

        source.onended = () => {
          logger.debug('Finished playing audio');
          audioContext.close();
          resolve();
        };

        source.onerror = (error) => {
          logger.error('Audio playback error:', error);
          audioContext.close();
          reject(new Error('Failed to play audio'));
        };

        source.start(0);
        logger.debug('Started playing audio');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Error in speak method:', errorMessage);
        reject(new Error(`Speech synthesis failed: ${errorMessage}`));
      }
    });
  }

  async getVoices() {
    try {
      const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Error fetching voices:', error);
      throw error;
    }
  }
}

let elevenLabsInstance: ElevenLabsService | null = null;

export function getElevenLabsService(config?: ElevenLabsConfig): ElevenLabsService {
  if (!elevenLabsInstance) {
    elevenLabsInstance = new ElevenLabsService(undefined, config);
  }
  return elevenLabsInstance;
}
