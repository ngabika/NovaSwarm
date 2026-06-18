import React, { useState } from "react";
import { BinanceState, BinanceTrade } from "../types";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  User, 
  Cpu, 
  Sparkles, 
  RotateCcw,
  RefreshCw, 
  AlertTriangle,
  Flame,
  ArrowRightLeft,
  Briefcase
} from "lucide-react";

interface BinanceDashboardProps {
  binanceState?: BinanceState;
  onRefreshState: () => void;
}

export function BinanceDashboard({ binanceState, onRefreshState }: BinanceDashboardProps) {
  const [tradeType, setTradeType] = useState<"BUY" | "SELL">("BUY");
  const [tradePair, setTradePair] = useState<"BTC/USDT" | "SOL/USDT">("BTC/USDT");
  const [tradeAmount, setTradeAmount] = useState<string>("0.01");
  const [executing, setExecuting] = useState(false);
  const [tradeError, setTradeError] = useState("");
  const [tradeSuccess, setTradeSuccess] = useState("");

  if (!binanceState) {
    return (
      <div className="bg-slate-950/20 border border-slate-800 p-8 rounded-2xl flex flex-col items-center justify-center text-center space-y-4">
        <AlertTriangle className="w-8 h-8 text-amber-500 animate-pulse" />
        <h3 className="text-sm font-bold text-slate-350">Binance modul nincsen inicializálva...</h3>
        <p className="text-xs text-slate-500 max-w-sm">
          A Binance szimulációs motor jelenleg nem érhető el. Kérlek indítsd el vagy frissítsd a rendszert!
        </p>
      </div>
    );
  }

  const { balanceUsdt, balanceBtc, balanceSol, btcPrice, solPrice, sentiment, recentTrades, newsSignal } = binanceState;

  // Calculatables
  const btcVal = Number((balanceBtc * btcPrice).toFixed(2));
  const solVal = Number((balanceSol * solPrice).toFixed(2));
  const totalPortfolio = Number((balanceUsdt + btcVal + solVal).toFixed(2));

  const handleManualTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setTradeError("");
    setTradeSuccess("");
    const amount = parseFloat(tradeAmount);

    if (isNaN(amount) || amount <= 0) {
      setTradeError("Kérlek adj meg egy érvényes, pozitív darabszámot!");
      return;
    }

    setExecuting(true);
    try {
      const res = await fetch("/api/binance/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: tradeType,
          pair: tradePair,
          amount: amount
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Hiba történt a szimulált Binance tranzakció futtatásakor.");
      }

      setTradeSuccess(`Sikeres ${tradeType === "BUY" ? "vásárlás" : "eladás"}! Tranzakció rögzítve.`);
      setTradeAmount("");
      onRefreshState();
    } catch (err: any) {
      setTradeError(err.message || "Ismeretlen hiba.");
    } finally {
      setExecuting(false);
    }
  };

  const handleResetPortfolio = async () => {
    if (!confirm("Biztosan alaphelyzetbe állítod a szimulált Binance portfóliót és tőkeegyenleget ($10,000 USDT)?")) return;
    setExecuting(true);
    try {
      const res = await fetch("/api/binance/reset", { method: "POST" });
      if (!res.ok) throw new Error("Sikertelen tárca reset.");
      setTradeSuccess("A szimulált Binance tárca sikeresen alaphelyzetbe állítva!");
      onRefreshState();
    } catch (err: any) {
      setTradeError(err.message || "Hiba az egyenlegek törlésekor.");
    } finally {
      setExecuting(false);
    }
  };

  const getSentimentText = (score: number) => {
    if (score < 30) return "Extrém Félelem 😨";
    if (score < 45) return "Félelem 😕";
    if (score < 55) return "Semleges 😐";
    if (score < 75) return "Mohóság (Greed) 🤑";
    return "Extrém Mohóság (Fomo) 🌋";
  };

  const getSentimentColorClass = (score: number) => {
    if (score < 30) return "bg-red-500";
    if (score < 45) return "bg-orange-500";
    if (score < 55) return "bg-slate-500";
    if (score < 75) return "bg-emerald-500";
    return "bg-green-400";
  };

  return (
    <div className="space-y-6" id="binance-dashboard-root">
      {/* Overview Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Assets Card */}
        <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Sim Portfolio Value</span>
            <Briefcase className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-bold tracking-tight text-white font-mono">
              ${totalPortfolio.toLocaleString()}
            </span>
            <div className="text-[9px] text-slate-500 flex items-center gap-1 mt-1 font-mono">
              <span className="text-emerald-400 font-bold">+4.2%</span> az alap tőkéhez képest ($10,000)
            </div>
          </div>
        </div>

        {/* USDT Balance */}
        <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">USDT Likviditás</span>
            <span className="text-[10px] bg-slate-800 text-slate-400 font-bold font-mono px-2 py-0.5 rounded border border-slate-700/60">Tether</span>
          </div>
          <div className="mt-2.5">
            <span className="text-xl font-bold text-slate-100 font-mono">${balanceUsdt.toLocaleString()}</span>
            <div className="text-[9px] text-slate-500 mt-1">Simulated spot fiat cash equivalent</div>
          </div>
        </div>

        {/* BTC Value */}
        <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Bitcoin (BTC) egyenleg</span>
            <span className="text-[10px] bg-amber-950/30 text-amber-500 font-bold font-mono px-2 py-0.5 rounded border border-amber-800/40">BTC</span>
          </div>
          <div className="mt-2.5">
            <span className="text-xl font-bold text-slate-100 font-mono">{balanceBtc} BTC</span>
            <div className="text-[9px] text-slate-400 mt-1 font-mono">${btcVal.toLocaleString()} USD</div>
          </div>
        </div>

        {/* SOL Value */}
        <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Solana (SOL) egyenleg</span>
            <span className="text-[10px] bg-purple-950/30 text-purple-400 font-bold font-mono px-2 py-0.5 rounded border border-purple-800/40">SOL</span>
          </div>
          <div className="mt-2.5">
            <span className="text-xl font-bold text-slate-100 font-mono">{balanceSol} SOL</span>
            <div className="text-[9px] text-slate-400 mt-1 font-mono">${solVal.toLocaleString()} USD</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Signals, Trading Panel and tickers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1 & 2: Market tickers & signals */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tickers & Fear-Greed Slider */}
          <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-800 space-y-5">
            <h4 className="text-xs font-bold tracking-widest text-slate-400 font-mono uppercase flex items-center gap-1.5 border-b border-slate-850 pb-3">
              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
              Live Szimulált Tőzsdei Árfolyamok (Mcp feed)
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* BTC Tick */}
              <div className="bg-slate-900/35 p-4 rounded-xl border border-slate-850 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-300">Bitcoin (BTC / USDT)</span>
                  <div className="text-xl font-mono font-bold text-white mt-1">${btcPrice.toLocaleString()}</div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="flex items-center text-xs font-mono font-semibold text-emerald-400">
                    <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                    +1.64%
                  </span>
                  <p className="text-[9px] text-slate-500 mt-1 font-mono">Volume: 8,421 BTC</p>
                </div>
              </div>

              {/* SOL Tick */}
              <div className="bg-slate-900/35 p-4 rounded-xl border border-slate-850 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-300">Solana (SOL / USDT)</span>
                  <div className="text-xl font-mono font-bold text-white mt-1">${solPrice.toLocaleString()}</div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="flex items-center text-xs font-mono font-semibold text-red-400">
                    <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                    -0.85%
                  </span>
                  <p className="text-[9px] text-slate-500 mt-1 font-mono">Volume: 122,940 SOL</p>
                </div>
              </div>
            </div>

            {/* Fear & Greed Slider */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Piaci Hangulat (Crypto Fear & Greed Index)</span>
                <span className={`px-2.5 py-0.5 rounded font-bold font-mono text-[10px] text-white ${getSentimentColorClass(sentiment)}`}>
                  {sentiment} / 100 • {getSentimentText(sentiment)}
                </span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-3.5 overflow-hidden border border-slate-800 p-0.5">
                <div 
                  className={`h-full rounded-full transition-all duration-700 ease-out ${getSentimentColorClass(sentiment)}`} 
                  style={{ width: `${sentiment}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0 (Extreme Fear)</span>
                <span>50 (Semleges)</span>
                <span>100 (Fomo / Extreme Greed)</span>
              </div>
            </div>
          </div>

          {/* Current News Signal Crawled by Nóra KriptoRadar */}
          <div className="bg-slate-950/45 p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3">
              <h4 className="text-xs font-bold tracking-widest text-slate-400 font-mono uppercase flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-purple-400 animate-pulse" />
                Nóra KriptoRadar Aktuális Hír-Szignálja
              </h4>
              <span className="text-[9px] text-slate-500 font-mono">Valós idejű hírkereső mcp</span>
            </div>

            {newsSignal ? (
              <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-850/80 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <div className="md:col-span-3 space-y-2">
                  <p className="text-xs font-bold text-white line-clamp-2 leading-relaxed">
                    "{newsSignal.headline}"
                  </p>
                  <div className="flex items-center gap-3 text-[10px] text-slate-450 font-mono">
                    <span>Forrás: Twitter/X Crawler • {newsSignal.agentName}</span>
                    <span>•</span>
                    <span>Frissítve: {new Date(newsSignal.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>

                <div className="md:col-span-1 flex flex-col gap-1 items-end md:items-center">
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider font-mono">Szignál döntés</div>
                  <span className={`px-4 py-1 rounded-full text-xs font-bold text-white shadow font-mono ${
                    newsSignal.recommendedAction === "BUY"
                      ? "bg-emerald-600 shadow-emerald-900/10"
                      : newsSignal.recommendedAction === "SELL"
                      ? "bg-red-650 shadow-red-950/10"
                      : "bg-slate-700 shadow-slate-950/10"
                  }`}>
                    {newsSignal.recommendedAction}
                  </span>
                  <div className="text-[9px] text-slate-405 font-mono mt-1">Sentiment: {newsSignal.sentimentScore}%</div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">Még nem futott hírkereső szignál.</p>
            )}
          </div>
        </div>

        {/* Column 3: Manual Trade Action Box */}
        <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="text-xs font-bold tracking-widest text-slate-400 font-mono uppercase flex items-center gap-1.5 border-b border-slate-850 pb-3">
              <ArrowRightLeft className="w-3.5 h-3.5 text-yellow-500" />
              Kereskedési Megbízás (Manual Spot)
            </h4>

            {tradeError && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-800 text-xs text-red-400 leading-relaxed">
                {tradeError}
              </div>
            )}

            {tradeSuccess && (
              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-400 leading-relaxed">
                {tradeSuccess}
              </div>
            )}

            <form onSubmit={handleManualTrade} className="space-y-4">
              {/* Type toggle: Buy / Sell */}
              <div>
                <label className="block text-[10px] text-slate-450 uppercase tracking-wider font-mono mb-1.5">Művelet</label>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setTradeType("BUY")}
                    className={`py-2 rounded-lg text-xs font-bold transition select-none cursor-pointer ${
                      tradeType === "BUY"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    VÁSÁRLÁS
                  </button>
                  <button
                    type="button"
                    onClick={() => setTradeType("SELL")}
                    className={`py-2 rounded-lg text-xs font-bold transition select-none cursor-pointer ${
                      tradeType === "SELL"
                        ? "bg-red-650 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    ELADÁS
                  </button>
                </div>
              </div>

              {/* Pair select */}
              <div>
                <label className="block text-[10px] text-slate-450 uppercase tracking-wider font-mono mb-1.5">Kereskedési Pár</label>
                <select
                  value={tradePair}
                  onChange={e => setTradePair(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 text-xs text-white rounded-xl p-3 focus:outline-none focus:border-yellow-500"
                >
                  <option value="BTC/USDT">BTC / USDT (Bitcoin)</option>
                  <option value="SOL/USDT">SOL / USDT (Solana)</option>
                </select>
              </div>

              {/* Amount input */}
              <div>
                <label className="block text-[10px] text-slate-450 uppercase tracking-wider font-mono mb-1.5">
                  Mennyiség ({tradePair.split("/")[0]})
                </label>
                <input
                  type="text"
                  value={tradeAmount}
                  onChange={e => setTradeAmount(e.target.value)}
                  placeholder={`pl. ${tradePair === "BTC/USDT" ? "0.05" : "3.5"}`}
                  className="w-full bg-slate-900 border border-slate-800 text-xs text-white rounded-xl p-3 focus:outline-none focus:border-yellow-500"
                />
              </div>

              {/* Estimate calculation block */}
              <div className="bg-slate-900/40 border border-slate-850 p-3.5 rounded-xl space-y-1.5 text-xs text-slate-400 font-mono">
                <div className="flex justify-between">
                  <span>Aktuális ár:</span>
                  <span className="font-bold text-white font-mono">
                    ${tradePair === "BTC/USDT" ? btcPrice.toLocaleString() : solPrice.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-850 pt-1.5 text-slate-300">
                  <span>Teljes becsült érték:</span>
                  <span className="font-bold text-amber-400 font-mono">
                    ${Number((parseFloat(tradeAmount || "0") * (tradePair === "BTC/USDT" ? btcPrice : solPrice)).toFixed(2)).toLocaleString()} USDT
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={executing || !tradeAmount}
                className={`w-full py-3 font-bold rounded-xl text-xs transition cursor-pointer flex justify-center items-center gap-1.5 select-none ${
                  tradeType === "BUY"
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white hover:shadow-lg shadow-emerald-990/10"
                    : "bg-red-650 hover:bg-red-550 text-white hover:shadow-lg shadow-red-950/10"
                } disabled:opacity-45 disabled:cursor-not-allowed`}
              >
                {executing ? (
                  <Sparkles className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <>
                    <span>Tranzakció Végrehajtása</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-6 border-t border-slate-850 pt-4 flex justify-between items-center">
            <span className="text-[10px] text-slate-500 font-mono">Probléma az adatokkal?</span>
            <button
              onClick={handleResetPortfolio}
              disabled={executing}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-850/80 border border-slate-800 rounded-lg text-[10px] font-bold text-slate-400 hover:text-white transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 text-yellow-500" />
              Szimulátor Reset
            </button>
          </div>
        </div>

      </div>

      {/* Transaction History Ledger */}
      <div className="bg-slate-950/40 rounded-2xl border border-slate-800 p-5 space-y-4">
        <h4 className="text-xs font-bold tracking-widest text-slate-400 font-mono uppercase flex items-center gap-1.5 border-b border-slate-850 pb-3">
          <DollarSign className="w-4 h-4 text-emerald-400" />
          Kereskedési Főkönyv és Tranzakciós Napló (Audit Ledger)
        </h4>

        {recentTrades.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-4">Még nincsenek végrehajtott tőzsdei tranzakciók.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800/80 text-slate-500 uppercase tracking-wider text-[10px] font-mono">
                  <th className="py-2">Művelet ID</th>
                  <th className="py-2">Időbélyeg</th>
                  <th className="py-2">Ügynök / Típus</th>
                  <th className="py-2">Pár</th>
                  <th className="py-2 text-right">Egységár</th>
                  <th className="py-2 text-right">Mennyiség</th>
                  <th className="py-2 text-right">Összesen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/50">
                {recentTrades.map(trade => (
                  <tr key={trade.id} className="hover:bg-slate-950/20 text-slate-300 transition-colors">
                    <td className="py-2.5 font-mono text-[10px] text-slate-500">{trade.id}</td>
                    <td className="py-2.5 text-slate-400">{new Date(trade.timestamp).toLocaleString()}</td>
                    <td className="py-2.5 flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${trade.agentName.includes("Manuális") ? "bg-blue-400" : "bg-emerald-400"}`} />
                      <div className="flex-1">
                        <div className="font-semibold">{trade.agentName}</div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          trade.type === "BUY"
                            ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/30"
                            : "bg-red-950/60 text-red-400 border border-red-900/30"
                        }`}>
                          {trade.type}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 font-mono text-slate-200">{trade.pair}</td>
                    <td className="py-2.5 text-right font-mono">${trade.price.toLocaleString()}</td>
                    <td className="py-2.5 text-right font-mono font-bold text-white">{trade.amount}</td>
                    <td className="py-2.5 text-right font-mono font-bold text-amber-400">${trade.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
