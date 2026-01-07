import { useEffect, useRef, useState } from 'react';

export function useVoiceRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState('');
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [useClientSideSTT, setUseClientSideSTT] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
    };
  }, []);

  const startRecording = async () => {
    if (isRecording) return;

    try {
      setRecordingStatus('Requesting microphone...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setRecordedAudio(audioBlob);
        setRecordingStatus('');
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingStatus('Recording...');
    } catch (error) {
      console.error('Failed to start recording:', error);
      setRecordingStatus('Microphone access denied');
      setTimeout(() => setRecordingStatus(''), 2000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playRecordedAudio = () => {
    if (!recordedAudio) return;

    const audioUrl = URL.createObjectURL(recordedAudio);
    const audio = new Audio(audioUrl);
    audioPlayerRef.current = audio;

    audio.onplay = () => setIsPlaying(true);
    audio.onended = () => {
      setIsPlaying(false);
      URL.revokeObjectURL(audioUrl);
    };
    audio.onerror = () => {
      setIsPlaying(false);
      URL.revokeObjectURL(audioUrl);
    };

    audio.play();
  };

  const stopPlayingAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const clearRecordedAudio = () => {
    setRecordedAudio(null);
    setRecognizedText('');
  };

  return {
    isRecording,
    recordingStatus,
    recordedAudio,
    isPlaying,
    recognizedText,
    useClientSideSTT,
    setRecordingStatus,
    setRecognizedText,
    setUseClientSideSTT,
    startRecording,
    stopRecording,
    playRecordedAudio,
    stopPlayingAudio,
    clearRecordedAudio,
  };
}
