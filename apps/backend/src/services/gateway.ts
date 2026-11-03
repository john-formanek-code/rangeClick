import { WebSocket } from 'ws';
import { EventBus } from './event.bus';
import { WsMessage, WsMessageType } from '@rangeclick/types';
import { MetricsService } from './metrics.service';

export class Gateway {
  private clients: Set<WebSocket> = new Set();
  // Map of client to their subscribed channels: Map<WebSocket, Set<string>>
  // Channel format: "BTC:60", "ETH:60", "GLOBAL"
  private subscriptions: Map<WebSocket, Set<string>> = new Map();
  private MAX_CONNECTIONS = 5000;

  constructor(
    private eventBus: EventBus,
    private metricsService: MetricsService
  ) {}

  public register(ws: WebSocket) {
    if (this.clients.size >= this.MAX_CONNECTIONS) {
        console.warn('⚠️ Max connections reached. Rejecting client.');
        ws.close(1008, 'Max connections reached');
        return;
    }
    this.clients.add(ws);
    this.subscriptions.set(ws, new Set(['GLOBAL'])); // Everyone gets global events
    this.metricsService.set('activeConnections', this.clients.size);
    console.log(`🔌 New Client Connected. Total: ${this.clients.size}`);

    ws.on('close', () => {
      this.clients.delete(ws);
      this.subscriptions.delete(ws);
      this.metricsService.set('activeConnections', this.clients.size);
      console.log(`❌ Client Disconnected. Total: ${this.clients.size}`);
    });

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'SUBSCRIBE') {
                const { instrument, tf } = msg.payload;
                const channel = `${instrument}:${tf}`;
                this.subscriptions.get(ws)?.add(channel);
                // Prices are not tf-specific — subscribe to instrument price feed
                this.subscriptions.get(ws)?.add(`${instrument}:PRICE`);
                console.log(`📡 Client subscribed to ${channel}`);
            } else if (msg.type === 'UNSUBSCRIBE') {
                const { instrument, tf } = msg.payload;
                const channel = `${instrument}:${tf}`;
                this.subscriptions.get(ws)?.delete(channel);
            } else if (msg.type === WsMessageType.AUTHENTICATE) {
                const { userId } = msg.payload;
                const channel = `USER:${userId}`;
                this.subscriptions.get(ws)?.add(channel);
                console.log(`🔑 Client authenticated as ${userId}`);
            }
        } catch (err) {
            console.error('Failed to parse client message', err);
        }
    });
  }

  public start() {
    // Subscribe to internal events and broadcast to relevant channels
    this.eventBus.subscribe('PRICE_UPDATE', (payload) => {
      // Prices are instrument-level, not tf-specific
      const channel = `${payload.instrument}:PRICE`;
      const health = payload.sourceCount || 3;
      this.broadcastToChannel(channel, {
        type: WsMessageType.PRICE_TICK,
        payload: { ...payload, sourceCount: health }
      });
    });

    this.eventBus.subscribe('ROUND_STATE', (payload) => {
      const channel = `${payload.instrument}:${payload.tf}`;
      this.broadcastToChannel(channel, { type: WsMessageType.ROUND_STATE, payload: { ...payload, status: 'CUTOFF' } });
    });

    this.eventBus.subscribe('ROUND_SETTLED', (payload) => {
      const channel = `${payload.round.instrument}:${payload.round.tf}`;
      this.broadcastToChannel(channel, { type: WsMessageType.SETTLEMENT, payload });
    });

    this.eventBus.subscribe('ROUND_DELAYED', (payload) => {
        const channel = `${payload.round.instrument}:${payload.round.tf}`;
        this.broadcastToChannel(channel, { type: WsMessageType.ROUND_STATE, payload: { ...payload.round, status: 'DELAYED' } });
    });
    
    this.eventBus.subscribe('ROUND_REFUNDED', (payload) => {
        const channel = `${payload.round.instrument}:${payload.round.tf}`;
        this.broadcastToChannel(channel, { type: WsMessageType.SETTLEMENT, payload: { ...payload, status: 'REFUNDED' } });
    });

    // New: Handle Real-time Wallet Updates (Section 8.1)
    this.eventBus.subscribe('WALLET_UPDATE', (payload) => {
        const channel = `USER:${payload.userId}`;
        this.broadcastToChannel(channel, { type: WsMessageType.WALLET_UPDATE, payload });
    });

    // Broadcast server time every 1s for client sync (GLOBAL)
    setInterval(() => {
      this.broadcastToChannel('GLOBAL', { 
        type: WsMessageType.TIME_SYNC, 
        payload: { server_ts: Date.now() } 
      });
    }, 1000);
  }

  private broadcastToChannel(channel: string, msg: WsMessage) {
    const data = JSON.stringify(msg);
    for (const [client, subs] of this.subscriptions.entries()) {
      if (subs.has(channel) && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  private broadcast(msg: WsMessage) {
    const data = JSON.stringify(msg);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }
}
