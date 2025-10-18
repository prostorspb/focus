
export enum InteractionMode {
  Text,
  AudioReady,
  Recording,
  CameraReady,
  Capturing,
}

export interface Note {
  id: string;
  type: 'text' | 'audio' | 'image';
  content: string; // for text, this is the text itself. for audio/image, this is a data URL
  timestamp: Date;
}
