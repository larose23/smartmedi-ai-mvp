import { CheckIn } from '@/types/triage';

interface RealTimeConfig {
  url: string;
  onUpdate: (data: CheckIn[]) => void;
  onError: (error: Error) => void;
}

export class RealTimeData {
  private ws: WebSocket | null = null;
  private config: RealTimeConfig;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout = 1000;

  constructor(config: RealTimeConfig) {
    this.config = config;
    this.connect();
  }

  private connect() {
    try {
      this.ws = new WebSocket(this.config.url);
      
      this.ws.onopen = () => {
        console.log('WebSocket connection established');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.config.onUpdate(data);
        } catch (error) {
          this.config.onError(error as Error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.config.onError(new Error('WebSocket connection error'));
      };

      this.ws.onclose = () => {
        console.log('WebSocket connection closed');
        this.reconnect();
      };
    } catch (error) {
      this.config.onError(error as Error);
    }
  }

  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect();
      }, this.reconnectTimeout * this.reconnectAttempts);
    } else {
      this.config.onError(new Error('Maximum reconnection attempts reached'));
    }
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
} 