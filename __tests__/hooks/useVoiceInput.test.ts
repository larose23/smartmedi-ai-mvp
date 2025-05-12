import { renderHook, act } from '@testing-library/react-hooks';
import { useVoiceInput } from '@/hooks/useVoiceInput';

describe('useVoiceInput', () => {
  const mockSpeechRecognition = {
    start: jest.fn(),
    stop: jest.fn(),
    onstart: null as (() => void) | null,
    onresult: null as ((event: any) => void) | null,
    onerror: null as ((event: any) => void) | null,
    onend: null as (() => void) | null,
  };

  beforeEach(() => {
    // Mock SpeechRecognition
    window.SpeechRecognition = jest.fn(() => mockSpeechRecognition);
    window.webkitSpeechRecognition = jest.fn(() => mockSpeechRecognition);
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useVoiceInput());

    expect(result.current.isListening).toBe(false);
    expect(result.current.transcript).toBe('');
    expect(result.current.error).toBe(null);
  });

  it('starts listening when startListening is called', () => {
    const { result } = renderHook(() => useVoiceInput());

    act(() => {
      result.current.startListening();
    });

    expect(mockSpeechRecognition.start).toHaveBeenCalled();
    expect(result.current.isListening).toBe(true);
  });

  it('stops listening when stopListening is called', () => {
    const { result } = renderHook(() => useVoiceInput());

    act(() => {
      result.current.startListening();
      result.current.stopListening();
    });

    expect(mockSpeechRecognition.stop).toHaveBeenCalled();
    expect(result.current.isListening).toBe(false);
  });

  it('updates transcript when speech is recognized', () => {
    const { result } = renderHook(() => useVoiceInput());

    act(() => {
      result.current.startListening();
      const mockEvent = {
        resultIndex: 0,
        results: [[{ transcript: 'Hello world' }]],
      };
      mockSpeechRecognition.onresult?.(mockEvent);
    });

    expect(result.current.transcript).toBe('Hello world');
  });

  it('handles errors during speech recognition', () => {
    const { result } = renderHook(() => useVoiceInput());

    act(() => {
      result.current.startListening();
      const mockEvent = { error: 'no-speech' };
      mockSpeechRecognition.onerror?.(mockEvent);
    });

    expect(result.current.error).toBe('Error occurred in recognition: no-speech');
    expect(result.current.isListening).toBe(false);
  });

  it('calls onResult callback when provided', () => {
    const onResult = jest.fn();
    const { result } = renderHook(() => useVoiceInput({ onResult }));

    act(() => {
      result.current.startListening();
      const mockEvent = {
        resultIndex: 0,
        results: [[{ transcript: 'Test transcript' }]],
      };
      mockSpeechRecognition.onresult?.(mockEvent);
    });

    expect(onResult).toHaveBeenCalledWith('Test transcript');
  });

  it('sets error when SpeechRecognition is not supported', () => {
    // Remove SpeechRecognition mock
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;

    const { result } = renderHook(() => useVoiceInput());

    act(() => {
      result.current.startListening();
    });

    expect(result.current.error).toBe('Speech recognition is not supported in this browser');
  });
}); 