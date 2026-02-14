import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Instrument } from '@rangeclick/types';
import { useGame } from './hooks/useGame';
import { api } from './services/api';
import { Wallet, User } from 'lucide-react';
import clsx from 'clsx';
import { ResponsiveContainer, AreaChart, Area, YAxis, XAxis, ReferenceLine } from 'recharts';

const CHART_FRACTION = 1 / 3;  // price graph occupies left 1/3
const YAXIS_WIDTH = 60;        // px reserved for Y-axis labels
const CHART_TOP_PAD = 20;      // px top padding inside chart area
const CHART_BOTTOM_PAD = 20;   // px bottom padding inside chart area
const FOOTER_HEIGHT = 40;      // px bottom bar
const TILE_COUNT = 9;          // 9 vertical tiles per column
const COL_WIDTH = 80;          // px width of each block column
const COL_GAP = 4;             // px gap between columns
const SETTLE_FLASH_MS = 2000;  // how long winning column stays visible after settlement

function App() {
  const [instrument, setInstrument] = useState(Instrument.BTC);
  const { price, rounds, tilesByRound, activeTiles, userId, username, wallet, login, activeBets, betHistory, refreshBets, timeOffset, healthySources, settledRounds, setSettledRounds } = useGame(instrument);
  const [priceHistory, setPriceHistory] = useState<{ price: number, time: number }[]>([]);
  const [betAmount, setBetAmount] = useState(10);
  const [placing, setPlacing] = useState(false);
  const [message, setMessage] = useState('');
  const [loginName, setLoginName] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [userLimits, setUserLimits] = useState({ max_bet_amount: 1000, max_bets_per_round: 10 });
  const [, forceRender] = useState(0);

  const gridRef = useRef<HTMLDivElement>(null);
  const tiles = activeTiles;
  const orderedTiles = useMemo(
    () => [...tiles].sort((a, b) => Number(b.max_price) - Number(a.max_price)),
    [tiles]
  );

  const serverTime = Date.now() + timeOffset;
  const activeRound = rounds[0];

  // Force re-render every second so block positions & countdowns update
  useEffect(() => {
    const id = setInterval(() => forceRender(n => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (userId) {
      api.getSettings(userId).then(setUserLimits);
    }
  }, [userId]);

  useEffect(() => {
    if (price !== null) {
      setPriceHistory(prev => [...prev.slice(-50), { price, time: Date.now() }]);
    }
  }, [price]);

  // Clean up expired settlement flashes
  useEffect(() => {
    if (settledRounds.length === 0) return;
    const id = setInterval(() => {
      const now = Date.now();
      setSettledRounds(prev => prev.filter(s => now - s.settledAt < SETTLE_FLASH_MS));
    }, 500);
    return () => clearInterval(id);
  }, [settledRounds.length, setSettledRounds]);

  // Shared Y-axis mapping: price -> pixel offset within the grid area
  // The grid area runs from CHART_TOP_PAD to (containerH - FOOTER_HEIGHT - CHART_BOTTOM_PAD)
  const priceToY = useCallback((priceValue: number, gridAreaHeight: number) => {
    if (!orderedTiles.length) return gridAreaHeight / 2;
    const gridMin = Number(orderedTiles[orderedTiles.length - 1].min_price);
    const gridMax = Number(orderedTiles[0].max_price);
    const range = gridMax - gridMin || 1;
    return ((gridMax - priceValue) / range) * gridAreaHeight;
  }, [orderedTiles]);

  const handleDeposit = async () => {
    if (!userId) return;
    try {
      await api.deposit(userId, 100);
      setMessage('Deposited $100.00');
      api.login(username!).then(() => refreshBets());
    } catch (err: any) {
      setMessage('Deposit failed');
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    try {
      await api.updateSettings({
        userId,
        maxBetAmount: Number(userLimits.max_bet_amount),
        maxBetsPerRound: Number(userLimits.max_bets_per_round)
      });
      setShowSettings(false);
      setMessage('Settings updated');
    } catch (err) {
      setMessage('Update failed');
    }
  };

  const handlePlaceBet = async (tileId: string, min: number, max: number, multiplier: number) => {
    if (!userId || !activeRound || placing) return;
    if (healthySources < 2) {
        setMessage('Market halted');
        return;
    }
    setPlacing(true);
    setMessage('');
    try {
      const idempotencyKey = `placebet:${userId}:${activeRound.id}:${tileId}:${Date.now()}`;
      await api.placeBet({
        userId,
        roundId: activeRound.id,
        tileId,
        amount: betAmount,
        tile: { min, max },
        multiplier,
        idempotencyKey
      });
      setMessage('Bet placed!');
      refreshBets();
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setPlacing(false);
    }
  };

  if (!userId) {
    return (
      <div className="min-h-screen bg-background text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-surface border border-white/10 rounded-2xl p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black tracking-tighter text-primary">RANGECLICK</h1>
            <p className="text-gray-500 font-medium">Enter a username to start playing</p>
          </div>
          <div className="space-y-4">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
              <input
                type="text"
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                placeholder="Username"
                className="w-full bg-background border border-white/10 rounded-xl py-4 pl-12 pr-4 font-bold focus:outline-none focus:border-primary transition"
                onKeyDown={(e) => e.key === 'Enter' && login(loginName)}
              />
            </div>
            <button
              onClick={() => login(loginName)}
              disabled={!loginName}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-black py-4 rounded-xl transition shadow-lg shadow-primary/20"
            >
              START PLAYING
            </button>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="h-screen w-screen bg-[#050505] text-white flex flex-col overflow-hidden font-sans select-none">
      <header className="h-12 border-b border-white/5 flex items-center justify-between px-4 bg-black/40 backdrop-blur-md shrink-0 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-baseline gap-2">
            <h1 className="text-sm font-black tracking-[0.4em] text-primary">RANGECLICK</h1>
            <div className="h-2 w-px bg-white/10" />
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{instrument} / USD</span>
          </div>
          <nav className="flex gap-1">
            {Object.values(Instrument).map((inst) => (
              <button key={inst} onClick={() => { setInstrument(inst); setPriceHistory([]); }}
                className={clsx("px-3 py-1 rounded text-[9px] font-black transition uppercase tracking-tighter",
                  instrument === inst ? "bg-primary/20 text-primary border border-primary/30" : "text-gray-600 hover:text-gray-400")}>
                {inst}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-white/5 px-3 py-1 rounded border border-white/5">
            <div className="flex flex-col items-end mr-2">
              <span className="text-[7px] font-bold text-gray-500 uppercase">Available</span>
              <span className="font-mono font-bold text-xs text-success">${wallet?.balance || '0.00'}</span>
            </div>
            <button onClick={handleDeposit} className="p-1 hover:text-primary transition"><Wallet size={12}/></button>
          </div>
          <button onClick={() => setShowSettings(true)} className="text-gray-600 hover:text-white transition"><User size={14} /></button>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden bg-[#050505]" ref={gridRef}>
        {(() => {
          const el = gridRef.current;
          const W = el ? el.getBoundingClientRect().width : 1200;
          const H = el ? el.getBoundingClientRect().height : 600;

          const chartRight = W * CHART_FRACTION;
          const gridAreaTop = CHART_TOP_PAD;
          const gridAreaH = H - FOOTER_HEIGHT - CHART_TOP_PAD - CHART_BOTTOM_PAD;
          const tileH = Math.floor(gridAreaH / TILE_COUNT);

          const gridMin = orderedTiles.length ? Number(orderedTiles[orderedTiles.length - 1].min_price) : 0;
          const gridMax = orderedTiles.length ? Number(orderedTiles[0].max_price) : 1;

          // Continuous scroll: X = chartRight + (timeLeft_seconds) * scrollSpeed
          // scrollSpeed maps one round (60s) to one column width + gap
          const scrollSpeed = (COL_WIDTH + COL_GAP) / 60; // px per second

          return <>
            {/* ── Price display ── */}
            <div className="absolute top-3 left-3 z-30 pointer-events-none">
              <div className="text-[8px] font-black text-primary uppercase tracking-[0.3em] mb-1">Live Price</div>
              <div className="text-3xl font-mono font-black tabular-nums text-white tracking-tighter drop-shadow-lg">
                {price?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>

            {/* ── Price chart (left 1/3) ── */}
            <div className="absolute left-0 top-0 pointer-events-none z-10"
              style={{ width: chartRight, height: H - FOOTER_HEIGHT }}>
              <div className="w-full h-full pt-16">
                {priceHistory.length > 1 && orderedTiles.length > 0 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={priceHistory}
                      margin={{ top: CHART_TOP_PAD, right: 0, left: 0, bottom: CHART_BOTTOM_PAD }}>
                      <defs>
                        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <YAxis
                        domain={[gridMin, gridMax]}
                        tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9, fontFamily: 'monospace' }}
                        stroke="rgba(255,255,255,0.06)"
                        width={YAXIS_WIDTH}
                      />
                      <XAxis dataKey="time" type="number" domain={['dataMin', 'dataMax']} hide />
                      <Area type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2}
                        fill="url(#chartGrad)" isAnimationActive={false} />
                      {price && (
                        <ReferenceLine y={price} stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 3" />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* ── Current price line spanning full width ── */}
            {price && orderedTiles.length > 0 && (() => {
              const yPx = gridAreaTop + priceToY(price, gridAreaH);
              return (
                <div className="absolute left-0 right-0 pointer-events-none z-40"
                  style={{ top: yPx }}>
                  <div className="h-px bg-primary/60 shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
                  <div className="absolute right-2 -top-3 text-[10px] font-mono font-bold text-primary bg-black/60 px-2 rounded">
                    ${price.toFixed(2)}
                  </div>
                </div>
              );
            })()}

            {/* ── Continuous block columns (right 2/3, scrolling R→L) ── */}
            {rounds.map((round) => {
              const columnTiles = tilesByRound[round.id] || tiles;
              const sortedColTiles = [...columnTiles].sort((a, b) => Number(b.max_price) - Number(a.max_price));

              const timeLeftMs = Math.max(0, Number(round.expiry_ts) - serverTime);
              const timeLeftS = timeLeftMs / 1000;

              // X position: continuous scroll based on time-to-expiry
              // timeLeft=0 → at chartRight (price line), timeLeft=60 → one col width to the right
              const currentX = chartRight + timeLeftS * scrollSpeed;

              // Don't render if off screen to the right
              if (currentX > W) return null;

              const isFirstColumn = timeLeftMs <= 60000 && rounds.indexOf(round) === 0;
              const isClosed = round.status !== 'OPEN';

              return sortedColTiles.map((tile, rowIdx) => {
                const isActive = activeBets.some(b => b.roundId === round.id && b.tileId === tile.id);
                const tileMin = Number(tile.min_price);
                const tileMax = Number(tile.max_price);
                const yTop = gridAreaTop + rowIdx * tileH;
                const priceInTile = price !== null && price >= tileMin && price < tileMax;

                return (
                  <button
                    key={`${round.id}-${tile.id}`}
                    disabled={isClosed || placing}
                    onClick={() => handlePlaceBet(tile.id, tileMin, tileMax, Number(tile.multiplier))}
                    className={clsx(
                      "absolute flex flex-col items-center justify-center z-20",
                      "border transition-all duration-500",
                      isActive
                        ? "bg-primary/15 border-primary shadow-[0_0_20px_rgba(59,130,246,0.4)]"
                        : priceInTile && isFirstColumn
                          ? "bg-primary/10 border-primary/40"
                          : "bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.06] hover:border-white/20",
                      isClosed && "opacity-30"
                    )}
                    style={{
                      left: currentX,
                      top: yTop,
                      width: COL_WIDTH,
                      height: tileH - 2,
                      transition: 'left 1s linear',
                    }}
                  >
                    <span className={clsx(
                      "font-black text-sm tabular-nums",
                      isActive ? "text-primary" : "text-gray-500"
                    )}>
                      {tile.multiplier}x
                    </span>
                    <span className="text-[8px] text-gray-600 font-mono mt-0.5">
                      {tileMin.toFixed(0)}-{tileMax.toFixed(0)}
                    </span>
                    {isFirstColumn && (
                      <span className="text-[8px] text-gray-500 font-bold mt-0.5">
                        {Math.floor(timeLeftS)}s
                      </span>
                    )}
                    {isActive && (
                      <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-primary rounded-full animate-pulse" />
                    )}
                  </button>
                );
              });
            })}

            {/* ── Settled column flash (winning block stays 2s then disappears) ── */}
            {settledRounds.map((settled) => {
              const roundTiles = tilesByRound[settled.roundId] || [];
              const sortedTiles = [...roundTiles].sort((a, b) => Number(b.max_price) - Number(a.max_price));
              if (sortedTiles.length === 0) return null;

              const elapsed = Date.now() - settled.settledAt;
              const fadeProgress = Math.min(1, elapsed / SETTLE_FLASH_MS);
              const opacity = fadeProgress > 0.7 ? 1 - ((fadeProgress - 0.7) / 0.3) : 1;

              return sortedTiles.map((tile, rowIdx) => {
                const tileMin = Number(tile.min_price);
                const tileMax = Number(tile.max_price);
                const yTop = gridAreaTop + rowIdx * tileH;
                const isWinner = settled.closePrice >= tileMin && settled.closePrice < tileMax;

                return (
                  <div
                    key={`settled-${settled.roundId}-${tile.id}`}
                    className={clsx(
                      "absolute flex flex-col items-center justify-center z-25 pointer-events-none border",
                      isWinner
                        ? "bg-success/25 border-success shadow-[0_0_30px_rgba(34,197,94,0.6)]"
                        : "bg-white/[0.01] border-white/[0.05]"
                    )}
                    style={{
                      left: chartRight,
                      top: yTop,
                      width: COL_WIDTH,
                      height: tileH - 2,
                      opacity,
                      transition: 'opacity 0.5s ease-out',
                    }}
                  >
                    {isWinner && (
                      <>
                        <span className="font-black text-sm text-success">WIN</span>
                        <span className="text-[8px] text-success/80 font-mono">
                          ${settled.closePrice.toFixed(0)}
                        </span>
                      </>
                    )}
                  </div>
                );
              });
            })}
          </>;
        })()}

        {/* ── Bottom bar ── */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center px-6 justify-between z-50 bg-black/80 backdrop-blur-xl border-t border-white/5"
          style={{ height: FOOTER_HEIGHT }}>
          <div className="flex items-center gap-8 overflow-hidden">
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Stake</span>
              <div className="flex gap-1">
                {[1, 5, 10, 50, 100].map(amt => (
                  <button key={amt} onClick={() => setBetAmount(amt)}
                    className={clsx("px-2 py-0.5 rounded text-[9px] font-black transition",
                      betAmount === amt ? "bg-primary text-white" : "text-gray-500 hover:text-white")}>
                    ${amt}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex gap-4 overflow-hidden">
              {betHistory.slice(0, 3).map(bet => (
                <div key={bet.id} className="flex items-center gap-2">
                  <span className={clsx("w-1.5 h-1.5 rounded-full", bet.status === 'WON' ? "bg-success" : "bg-gray-700")} />
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                    ${bet.amount} {'\u2192'} {bet.status === 'WON' ? `+$${bet.payout}` : 'Lose'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Toast message ── */}
        {message && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[100]">
            <div className="bg-primary text-black px-8 py-2 rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_0_40px_rgba(59,130,246,0.5)]">
              {message}
            </div>
          </div>
        )}
      </main>

      {showSettings && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
           <form onSubmit={handleUpdateSettings} className="bg-[#0a0a0a] border border-white/5 rounded-2xl max-w-md w-full p-8 space-y-8 shadow-2xl">
              <div className="flex justify-between items-start">
                <h2 className="text-xl font-black tracking-widest uppercase text-primary">Terminal Config</h2>
                <button type="button" onClick={() => setShowSettings(false)} className="text-gray-600 hover:text-white font-black text-xs uppercase underline">Close</button>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em]">Session Cap ($)</label>
                  <input type="number" value={userLimits.max_bet_amount} onChange={(e) => setUserLimits(prev => ({ ...prev, max_bet_amount: Number(e.target.value) }))}
                    className="w-full bg-white/5 border border-white/5 rounded-lg p-4 font-mono font-black text-sm focus:outline-none focus:border-primary transition text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em]">Max Burst (Bets/Round)</label>
                  <input type="number" value={userLimits.max_bets_per_round} onChange={(e) => setUserLimits(prev => ({ ...prev, max_bets_per_round: Number(e.target.value) }))}
                    className="w-full bg-white/5 border border-white/5 rounded-lg p-4 font-mono font-black text-sm focus:outline-none focus:border-primary transition text-white" />
                </div>
              </div>
              <button type="submit" className="w-full bg-primary text-black font-black py-4 rounded-xl transition shadow-lg shadow-primary/20 uppercase tracking-widest">Update Policy</button>
           </form>
        </div>
      )}
    </div>
  );
}

export default App;
