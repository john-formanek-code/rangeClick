import { type WsMessage } from '@rangeclick/types';

export class SocketService {
  private ws: WebSocket | null = null;
  private listeners: ((msg: WsMessage) => void)[] = [];
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    this.ws = new WebSocket(this.url);
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data) as WsMessage;
      this.listeners.forEach(l => l(msg));
    };
    this.ws.onclose = () => {
      setTimeout(() => this.connect(), 2000);
    };
  }

  onMessage(callback: (msg: WsMessage) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  subscribe(instrument: string, tf: number) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'SUBSCRIBE',
        payload: { instrument, tf }
      }));
    } else {
        // Retry shortly if not open
        setTimeout(() => this.subscribe(instrument, tf), 500);
    }
  }

  authenticate(userId: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'AUTHENTICATE',
        payload: { userId }
      }));
    } else {
        setTimeout(() => this.authenticate(userId), 500);
    }
  }
}

export const socketService = new SocketService('ws://localhost:1605/ws');
