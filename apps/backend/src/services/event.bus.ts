import { EventEmitter } from 'events';
import { Instrument, MarketTick } from '@rangeclick/types';

// Simple typed event bus
export class EventBus extends EventEmitter {
  publish(event: string, payload: any) {
    this.emit(event, payload);
  }

  subscribe(event: string, callback: (payload: any) => void) {
    this.on(event, callback);
  }
}

export const globalEventBus = new EventBus();
