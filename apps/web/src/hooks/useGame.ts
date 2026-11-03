import { useState, useEffect, useCallback } from 'react';
import { Instrument, type Round, WsMessageType, type Bet } from '@rangeclick/types';
import { api } from '../services/api';
import { socketService } from '../services/socket';

export interface SettledRound {
  roundId: string;
  closePrice: number;
  settledAt: number; // Date.now() when we received it
}

export function useGame(instrument: Instrument) {
  const [price, setPrice] = useState<number | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [tilesByRound, setTilesByRound] = useState<Record<string, any[]>>({});
  const [username, setUsername] = useState<string | null>(localStorage.getItem('username'));
  const [userId, setUserId] = useState<string | null>(localStorage.getItem('userId'));
  const [wallet, setWallet] = useState<any>(null);
  const [activeBets, setActiveBets] = useState<Bet[]>([]);
  const [betHistory, setBetHistory] = useState<Bet[]>([]);
  const [timeOffset, setTimeOffset] = useState<number>(0);
  const [healthySources, setHealthySources] = useState<number>(3);
  const [settledRounds, setSettledRounds] = useState<SettledRound[]>([]);

  const loadTiles = useCallback(async (roundList: Round[]) => {
    if (!roundList || roundList.length === 0) return;
    const entries = await Promise.all(roundList.map(async (r) => {
      const ts = await api.getTiles(r.id);
      return [r.id, ts] as [string, any[]];
    }));
    setTilesByRound(Object.fromEntries(entries));
  }, []);

  const refreshBets = useCallback(async () => {
    if (userId) {
        const active = await api.getActiveBets(userId);
        const history = await api.getBetHistory(userId);
        setActiveBets(active);
        setBetHistory(history);
    }
  }, [userId]);

  const login = async (name: string) => {
    const auth = await api.login(name);
    setUserId(auth.userId);
    setUsername(auth.username);
    setWallet(auth.wallet);
    localStorage.setItem('userId', auth.userId);
    localStorage.setItem('username', auth.username);
    socketService.authenticate(auth.userId);
  };

  useEffect(() => {
    // Initial Data
    const init = async () => {
      if (username) {
        await login(username);
      }

      const activeRounds = await api.getRounds(instrument);
      setRounds(activeRounds);
      await loadTiles(activeRounds);
    };

    init();
    socketService.connect();
    socketService.subscribe(instrument, 300);

    const cleanup = socketService.onMessage((msg) => {
      if (msg.type === WsMessageType.PRICE_TICK) {
        const tick = msg.payload as any;
        if (tick.instrument === instrument) {
          setPrice(tick.price);
          if (tick.sourceCount !== undefined) {
            setHealthySources(tick.sourceCount);
          }
        }
      } else if (msg.type === WsMessageType.ROUND_STATE) {
          api.getRounds(instrument).then(async rs => {
            setRounds(rs);
            await loadTiles(rs);
          });
      } else if (msg.type === WsMessageType.SETTLEMENT) {
          const { round: settledRound, closePrice } = msg.payload;
          if (settledRound && closePrice != null) {
            setSettledRounds(prev => [
              ...prev,
              { roundId: settledRound.id, closePrice, settledAt: Date.now() }
            ]);
          }
          api.getRounds(instrument).then(setRounds);
          if (username) {
            refreshBets();
          }
      } else if (msg.type === WsMessageType.WALLET_UPDATE) {
          setWallet((prev: any) => ({ ...prev, balance: msg.payload.balance }));
      } else if (msg.type === WsMessageType.TIME_SYNC) {
          const { server_ts } = msg.payload;
          setTimeOffset(server_ts - Date.now());
      }
    });

    return cleanup;
  }, [instrument, username, refreshBets]);

  // Initial bet fetch when userId is set
  useEffect(() => {
      refreshBets();
  }, [refreshBets]);

  const activeTiles = rounds[0] ? (tilesByRound[rounds[0].id] || []) : [];

  return { price, rounds, tilesByRound, activeTiles, userId, username, wallet, login, activeBets, betHistory, refreshBets, timeOffset, healthySources, settledRounds, setSettledRounds };
}
