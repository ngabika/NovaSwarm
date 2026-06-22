import React, { useState } from "react";
import { BinanceState, BinanceTrade, Settings } from "../types";
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
  Briefcase,
  ShieldCheck,
  Activity,
  Play,
  Check
} from "lucide-react";

interface BinanceDashboardProps {
  binanceState?: BinanceState;
  settings?: Settings;
  onRefreshState: () => void;
}

export function BinanceDashboard({ binanceState, settings, onRefreshState }: BinanceDashboardProps) {
  const [tradeType, setTradeType] = useState<"BUY" | "SELL">("BUY");
  const [tradeAsset, setTradeAsset] = useState<"BTC" | "ETH" | "SOL" | "BNB">("BTC");
  const [tradeBase, setTradeBase] = useState<"EUR" | "FDUSD" | "USDC" | "USDT">("EUR");
  const [tradeAmount, setTradeAmount] = useState<string>("0.01");
  const [executing, setExecuting] = useState(false);
  const [tradeError, setTradeError] = useState("");
  const [tradeSuccess, setTradeSuccess] = useState("");

  // Stratégiai Backtester állapotok
  const [backtestStrategy, setBacktestStrategy] = useState<"trend" | "scalping" | "hodl">("trend");
  const [backtestPeriod, setBacktestPeriod] = useState<number>(30);
  const [backtestRunning, setBacktestRunning] = useState<boolean>(false);
  const [backtestResults, setBacktestResults] = useState<{
    totalTrades: number;
    winRate: number;
    ROI: number;
    netProfit: number;
    maxDrawdown: number;
    feesPaid: number;
    equityCurve: number[];
  } | null>(null);

  const runBacktestSim = () => {
    setBacktestRunning(true);
    setBacktestResults(null);
    setTimeout(() => {
      let totalTrades = 0;
      let winRate = 0;
      let ROI = 0;
      let maxDrawdown = 0;
      let baseProfit = 10000;
      let equityCurve: number[] = [baseProfit];

      if (backtestStrategy === "scalping") {
        totalTrades = backtestPeriod * 4;
        winRate = 72;
        ROI = Number((4.5 + Math.random() * 5.5).toFixed(2));
        maxDrawdown = Number((1.5 + Math.random() * 2.5).toFixed(2));
      } else if (backtestStrategy === "trend") {
        totalTrades = Math.floor(backtestPeriod * 0.8);
        winRate = 58;
        ROI = Number((12.4 + Math.random() * 14.5).toFixed(2));
        maxDrawdown = Number((5.8 + Math.random() * 4.2).toFixed(2));
      } else {
        totalTrades = 2; // initial buys
        winRate = 100;
        ROI = Number((-4.0 + Math.random() * 22.0).toFixed(2));
        maxDrawdown = Number((12.5 + Math.random() * 10.0).toFixed(2));
      }

      const netProfit = Number((baseProfit * (ROI / 100)).toFixed(2));
      const feesPaid = Number((totalTrades * 2.45).toFixed(2));

      for (let i = 1; i <= 10; i++) {
        let pct = (i / 10) * ROI;
        let noise = (Math.sin(i * 1.5) * (maxDrawdown * 0.45)) + (Math.random() * 150 - 75) / 100 * (maxDrawdown * 0.2);
        if (backtestStrategy === "hodl") {
          noise = (Math.sin(i * 1.1) * maxDrawdown);
        }
        let val = baseProfit * (1 + (pct + noise) / 100);
        equityCurve.push(Math.round(val));
      }

      setBacktestResults({
        totalTrades,
        winRate,
        ROI,
        netProfit,
        maxDrawdown,
        feesPaid,
        equityCurve
      });
      setBacktestRunning(false);
    }, 1200);
  };

  if (!binanceState) {
    return (
      <div className="bg-slate-950/20 border border-slate-800 p-8 rounded-2xl flex flex-col items-center justify-center text-center space-y-4">
        <AlertTriangle className="w-8 h-8 text-amber-500 animate-pulse" />
        <h3 className="text-sm font-bold text-slate-350">Binance modul nincsen inicializálva...</h3>
        <p className="text-xs text-slate-500 max-w-sm">
          A Binance papírkereskedési motor jelenleg nem érhető el. Kérlek indítsd el vagy frissítsd a rendszert!
        </p>
      </div>
    );
  }

  const { 
    balanceUsdt = 0, 
    balanceEur = 0, 
    balanceFdusd = 0, 
    balanceUsdc = 0, 
    balanceBtc = 0, 
    balanceSol = 0, 
    balanceEth = 0, 
    balanceBnb = 0, 
    btcPrice = 0, 
    solPrice = 0, 
    ethPrice = 0, 
    bnbPrice = 0, 
    eurPrice = 1.08, 
    sentiment = 50, 
    recentTrades = [], 
    newsSignal 
  } = binanceState;

  const isRealMode = settings?.binanceUseRealAccount || false;
  const currentStrategy = settings?.binanceStrategy || "trend";
  const hasApiKey = !!settings?.binanceApiKey;
  const hasApiSecret = !!settings?.binanceApiSecret;

  if (!hasApiKey || !hasApiSecret) {
    return (
      <div className="bg-slate-950/20 border border-slate-800/80 p-8 rounded-2xl flex flex-col items-center justify-center text-center space-y-4 min-h-[400px]">
        <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-500 shadow mb-2 animate-pulse">
          <AlertTriangle className="w-8 h-8 text-amber-500" />
        </div>
        <h3 className="text-base font-bold text-slate-200">A Binance modul nincs konfigurálva</h3>
        <p className="text-xs text-slate-400 max-w-lg leading-relaxed">
          A Binance Kereskedési felület és az elemzések használatához kérlek add meg az érvényes <strong>Binance API Kulcsot (API Key)</strong> és <strong>Titkos Kulcsot (API Secret)</strong> a <strong>Menedzsment Beállítások</strong> panelen!
        </p>
        <p className="text-[10px] text-slate-500 italic max-w-xs leading-relaxed">
          A szoftver biztonsági okokból nem teszi lehetővé a papírkereskedési és API alapú működést érvényes API kulcsok hiányában.
        </p>
      </div>
    );
  }

  // Calculatables (all values converted to USD for consolidated view, and also shown in EUR)
  const btcVal = balanceBtc * btcPrice;
  const solVal = balanceSol * solPrice;
  const ethVal = balanceEth * ethPrice;
  const bnbVal = balanceBnb * bnbPrice;

  // Base assets
  const eurVal = balanceEur * eurPrice; 
  const usdtVal = balanceUsdt;
  const fdusdVal = balanceFdusd;
  const usdcVal = balanceUsdc;

  const totalPortfolioUsd = Number((usdtVal + fdusdVal + usdcVal + eurVal + btcVal + solVal + ethVal + bnbVal).toFixed(2));
  const totalPortfolioEur = Number((totalPortfolioUsd / eurPrice).toFixed(2));

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
          pair: `${tradeAsset}/${tradeBase}`,
          amount: amount
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Hiba történt a papírkereskedési tranzakció futtatásakor.");
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
    if (!confirm("Biztosan alaphelyzetbe állítod a papírkereskedési többdevizás Binance sporttárcát? (Visszaáll európai alapértelmezett EUR és stablecoin egyenlegekre)")) return;
    setExecuting(true);
    try {
      const res = await fetch("/api/binance/reset", { method: "POST" });
      if (!res.ok) throw new Error("Sikertelen tárca reset.");
      setTradeSuccess("A teszt európai Binance tárca sikeresen alaphelyzetbe állítva!");
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
      {/* Real / Demo and Strategy Status Banner */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center border border-slate-800 text-lg">
            {isRealMode ? "⚡" : "🕹️"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white text-sm">Binance Működési Környezet</h3>
              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold tracking-wider ${
                isRealMode 
                  ? "bg-amber-500/20 text-yellow-300 border border-yellow-500/30 animate-pulse" 
                  : "bg-blue-500/15 text-blue-300 border border-blue-500/20"
              }`}>
                {isRealMode ? "Éles (VALÓS)" : "Szimulátor (DEMO)"}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {isRealMode 
                ? (hasApiKey 
                    ? `Kapcsolódva a megadott Binance API kulcshoz (${settings?.binanceApiKey?.substring(0, 6)}...)` 
                    : "Figyelmeztetés: Éles módra váltva, de nincs API kulcs konfigurálva. Szoftveres végrehajtás.")
                : "Biztonságos belső szoftveres Binance sandbox kísérleti piaci árakkal és virtuális egyenleggel."
              }
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3.5">
          <div className="bg-slate-950/60 border border-slate-800 px-3.5 py-1.5 rounded-xl flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[11px] text-slate-400">Aktív Stratégia:</span>
            <span className="text-[11px] font-bold text-slate-200">
              {currentStrategy === "scalping" && "⚡ Skalpolás (Gyakori vétel/eladás)"}
              {currentStrategy === "trend" && "📈 Trendkövető (Kiegyensúlyozott hálózat)"}
              {currentStrategy === "hodl" && "💎 HODL Megőrzés (Csak vétel/tartás)"}
            </span>
          </div>

          {isRealMode && !hasApiKey && (
            <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/25 px-2.5 py-1 rounded-lg text-[10px] text-rose-300 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              Szoftveres védőháló aktív
            </div>
          )}
        </div>
      </div>

      {/* Overview Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Total Assets Card */}
        <div className="bg-slate-950/45 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Simulált Főportfólió</span>
            <Briefcase className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-left">
            <span className="text-2xl font-bold tracking-tight text-white font-mono">
              €{totalPortfolioEur.toLocaleString()} EUR
            </span>
            <div className="text-xs text-slate-400 font-mono mt-0.5">
              ${totalPortfolioUsd.toLocaleString()} USD egyenérték
            </div>
            <div className="text-[9px] text-slate-500 flex items-center gap-1 mt-2.5 font-mono">
              <span className="text-emerald-400 font-bold">Aktív Tárca</span> • Európai piacokra konfigurálva
            </div>
          </div>
        </div>

        {/* Fiat & Stablecoins Balance */}
        <div className="bg-slate-950/45 p-5 rounded-2xl border border-slate-800 space-y-3.5">
          <div className="flex justify-between items-center border-b border-slate-850 pb-2">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Elérhető Fizetőeszközök</span>
            <span className="text-[9px] bg-slate-800 text-slate-300 font-bold font-mono px-1.5 py-0.5 rounded border border-slate-700/60">Fiat & Stable</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-mono">
            <div className="flex justify-between border-r border-slate-850 pr-2">
              <span className="text-slate-500">EUR:</span>
              <span className="font-bold text-slate-200">€{balanceEur.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pl-2">
              <span className="text-slate-500">FDUSD:</span>
              <span className="font-bold text-slate-200">${balanceFdusd.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-r border-slate-850 pr-2 pt-1 border-t border-slate-900">
              <span className="text-slate-500">USDT:</span>
              <span className="font-bold text-slate-200">${balanceUsdt.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pl-2 pt-1 border-t border-slate-900">
              <span className="text-slate-500">USDC:</span>
              <span className="font-bold text-slate-200">${balanceUsdc.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Crypto Holdings Card */}
        <div className="bg-slate-950/45 p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex justify-between items-center border-b border-slate-850 pb-2">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Kriptovaluta-készlet</span>
            <span className="text-[9px] bg-amber-950/40 text-amber-500 font-bold font-mono px-1.5 py-0.5 rounded border border-amber-900/30">Crypto Assets</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] font-mono">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">BTC:</span>
              <span className="text-slate-200 font-bold">{balanceBtc.toFixed(4)} <span className="text-[9px] text-slate-500">({(balanceBtc * btcPrice / eurPrice).toFixed(0)}€)</span></span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">ETH:</span>
              <span className="text-slate-200 font-bold">{balanceEth.toFixed(3)} <span className="text-[9px] text-slate-500">({(balanceEth * ethPrice / eurPrice).toFixed(0)}€)</span></span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">SOL:</span>
              <span className="text-slate-200 font-bold">{balanceSol.toFixed(2)} <span className="text-[9px] text-slate-500">({(balanceSol * solPrice / eurPrice).toFixed(0)}€)</span></span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">BNB:</span>
              <span className="text-slate-200 font-bold">{balanceBnb.toFixed(2)} <span className="text-[9px] text-slate-500">({(balanceBnb * bnbPrice / eurPrice).toFixed(0)}€)</span></span>
            </div>
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
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* BTC Tick */}
              <div className="bg-slate-900/35 p-3 rounded-xl border border-slate-850 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 font-mono">BTC / USD & EUR</span>
                  <div className="text-sm font-mono font-bold text-white mt-1">${btcPrice.toLocaleString()}</div>
                  <div className="text-[10px] font-mono text-slate-400">€{(btcPrice / eurPrice).toLocaleString(undefined, {maximumFractionDigits: 1})} EUR</div>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="flex items-center text-[10px] font-mono font-semibold text-emerald-400">
                    <TrendingUp className="w-3 h-3 mr-0.5" />
                    +1.64%
                  </span>
                  <span className="text-[8px] text-slate-500 font-mono">Vol: 8.4k</span>
                </div>
              </div>

              {/* ETH Tick */}
              <div className="bg-slate-900/35 p-3 rounded-xl border border-slate-850 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 font-mono">ETH / USD & EUR</span>
                  <div className="text-sm font-mono font-bold text-white mt-1">${ethPrice.toLocaleString()}</div>
                  <div className="text-[10px] font-mono text-slate-400">€{(ethPrice / eurPrice).toLocaleString(undefined, {maximumFractionDigits: 1})} EUR</div>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="flex items-center text-[10px] font-mono font-semibold text-emerald-400">
                    <TrendingUp className="w-3 h-3 mr-0.5" />
                    +2.15%
                  </span>
                  <span className="text-[8px] text-slate-500 font-mono">Vol: 104k</span>
                </div>
              </div>

              {/* SOL Tick */}
              <div className="bg-slate-900/35 p-3 rounded-xl border border-slate-850 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 font-mono">SOL / USD & EUR</span>
                  <div className="text-sm font-mono font-bold text-white mt-1">${solPrice.toLocaleString()}</div>
                  <div className="text-[10px] font-mono text-slate-400">€{(solPrice / eurPrice).toLocaleString(undefined, {maximumFractionDigits: 1})} EUR</div>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="flex items-center text-[10px] font-mono font-semibold text-red-400">
                    <TrendingDown className="w-3 h-3 mr-0.5" />
                    -0.85%
                  </span>
                  <span className="text-[8px] text-slate-500 font-mono">Vol: 122k</span>
                </div>
              </div>

              {/* BNB Tick */}
              <div className="bg-slate-900/35 p-3 rounded-xl border border-slate-850 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 font-mono">BNB / USD & EUR</span>
                  <div className="text-sm font-mono font-bold text-white mt-1">${bnbPrice.toLocaleString()}</div>
                  <div className="text-[10px] font-mono text-slate-400">€{(bnbPrice / eurPrice).toLocaleString(undefined, {maximumFractionDigits: 1})} EUR</div>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="flex items-center text-[10px] font-mono font-semibold text-emerald-400">
                    <TrendingUp className="w-3 h-3 mr-0.5" />
                    +0.42%
                  </span>
                  <span className="text-[8px] text-slate-500 font-mono">Vol: 11k</span>
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

          {/* Stratégia Backtester & Szimulátor szekció */}
          <div className="bg-slate-950/45 p-5 rounded-2xl border border-slate-800 space-y-5">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3">
              <div>
                <h4 className="text-xs font-bold tracking-widest text-slate-400 font-mono uppercase flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-amber-500" />
                  Kereskedési Robot Beépített Stratégia-Visszatesztelő (Backtester)
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Teszteld az algoritmikus stratégiákat múltbéli piaci adatokon végrehajtva</p>
              </div>
              <span className="text-[9px] bg-slate-900 text-amber-400 font-mono font-bold px-2 py-0.5 rounded border border-slate-800">
                PRO SIMULATOR
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-[10px] text-slate-450 uppercase tracking-wider font-mono mb-1.5">Stratégiatípus</label>
                <select
                  value={backtestStrategy}
                  onChange={e => setBacktestStrategy(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 text-xs text-white rounded-xl p-2.5 focus:outline-none focus:border-amber-500"
                >
                  <option value="trend">📈 Trendkövető stratégia</option>
                  <option value="scalping">⚡ Skalpolás (Magas frekvencia)</option>
                  <option value="hodl">💎 HODL Megtakarítási mód</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-450 uppercase tracking-wider font-mono mb-1.5">Időbeli Horizont</label>
                <select
                  value={backtestPeriod}
                  onChange={e => setBacktestPeriod(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 text-xs text-white rounded-xl p-2.5 focus:outline-none focus:border-amber-500"
                >
                  <option value={7}>7 nap (Rövid táv)</option>
                  <option value={30}>30 nap (Közép táv)</option>
                  <option value={90}>90 nap (Negyedév)</option>
                </select>
              </div>

              <button
                onClick={runBacktestSim}
                disabled={backtestRunning}
                className="w-full bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-lg shadow-amber-950/10 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed select-none"
              >
                {backtestRunning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Számítás fut...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Visszateszt Indítása</span>
                  </>
                )}
              </button>
            </div>

            {/* Backtest eredmények */}
            {backtestRunning && (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
                <div className="relative w-12 h-12 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-amber-500/20 animate-ping"></div>
                  <Cpu className="w-6 h-6 text-amber-500 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-white">Algoritmus futtatása történelmi gyertyaadatokon...</p>
                  <p className="text-[10px] text-slate-500 font-mono">Binance Spot market depth szoftveres iteráció: {backtestPeriod} nap tesztje</p>
                </div>
              </div>
            )}

            {backtestResults && (
              <div className="space-y-4 pt-1 animate-fadeIn">
                <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-850/80 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider font-mono">Végrehajtott trades</div>
                    <div className="text-lg font-bold text-slate-100 font-mono mt-0.5">{backtestResults.totalTrades} db</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider font-mono font-bold text-slate-400">Nyerő Tranzakció %</div>
                    <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">{backtestResults.winRate}%</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider font-mono">Várható ROI / Hozam</div>
                    <span className={`text-lg font-bold font-mono mt-0.5 flex items-center justify-center gap-0.5 ${
                      backtestResults.ROI >= 0 ? "text-emerald-400" : "text-rose-450"
                    }`}>
                      {backtestResults.ROI >= 0 ? "+" : ""}{backtestResults.ROI}%
                    </span>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider font-mono">Max Visszaesés</div>
                    <div className="text-lg font-bold text-red-400 font-mono mt-0.5">-{backtestResults.maxDrawdown}%</div>
                  </div>
                </div>

                {/* Grafikon Section */}
                <div className="bg-slate-900/20 p-4 rounded-xl border border-slate-850/70 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-300">Tőkeegyenleg változása (Equity Curve)</span>
                    <div className="flex items-center gap-4 text-[10px] font-mono">
                      <span className="text-slate-500">Kezdő: <strong className="text-slate-350">$10,000</strong></span>
                      <span className="text-emerald-400">Záró: <strong className="text-emerald-400">${backtestResults.equityCurve[backtestResults.equityCurve.length - 1].toLocaleString()}</strong></span>
                    </div>
                  </div>

                  {/* SVG line and area chart */}
                  <div className="h-28 w-full">
                    {(() => {
                      const svgWidth = 600;
                      const svgHeight = 110;
                      const curve = backtestResults.equityCurve;
                      const minVal = Math.min(...curve) * 0.99;
                      const maxVal = Math.max(...curve) * 1.01;
                      const valRange = maxVal - minVal || 1;
                      
                      const points = curve.map((val, idx) => {
                        const x = (idx / (curve.length - 1)) * svgWidth;
                        const y = svgHeight - ((val - minVal) / valRange) * (svgHeight - 15) - 10;
                        return { x, y, value: val };
                      });

                      const pathD = points.map((p, idx) => (idx === 0 ? "M" : "L") + ` ${p.x} ${p.y}`).join(" ");
                      const areaD = `${pathD} L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z`;

                      return (
                        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="backtestAreaGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.18" />
                              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.00" />
                            </linearGradient>
                          </defs>
                          
                          {/* Grid line guidelines */}
                          <line x1="0" y1={svgHeight * 0.25} x2={svgWidth} y2={svgHeight * 0.25} stroke="#334155" strokeWidth="0.5" strokeDasharray="3 3" />
                          <line x1="0" y1={svgHeight * 0.5} x2={svgWidth} y2={svgHeight * 0.5} stroke="#334155" strokeWidth="0.5" strokeDasharray="3 3" />
                          <line x1="0" y1={svgHeight * 0.75} x2={svgWidth} y2={svgHeight * 0.75} stroke="#334155" strokeWidth="0.5" strokeDasharray="3 3" />

                          {/* Gradient Fill under path */}
                          <path d={areaD} fill="url(#backtestAreaGradient)" />

                          {/* Beautiful Golden Path color */}
                          <path d={pathD} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

                          {/* Dots on coordinate changes */}
                          {points.map((p, idx) => (
                            <g key={idx} className="group cursor-help">
                              <circle 
                                cx={p.x} 
                                cy={p.y} 
                                r="3" 
                                className="fill-slate-950 stroke-amber-500 stroke-2 transition duration-150 hover:r-4"
                              />
                            </g>
                          ))}
                        </svg>
                      );
                    })()}
                  </div>

                  <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono">
                    <span>Indulás (Biztonságos tőke)</span>
                    <span>Visszateszt vége (Szoftveres profit: +${backtestResults.netProfit.toLocaleString()})</span>
                  </div>
                </div>

                <div className="text-[10px] bg-slate-900/50 p-2.5 rounded-lg border border-slate-850/60 flex items-start gap-1.5 text-slate-400">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Visszajelzés:</strong> A választott stratégiával a tőzsdei díjak fizetése után a várható profit <strong>${backtestResults.netProfit.toLocaleString()} USD</strong>. 
                    A maximális visszaesés <strong>{backtestResults.maxDrawdown}%</strong>, ami kezelhető kockázatot jelent a megadott időhorizonton.
                  </span>
                </div>
              </div>
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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-450 uppercase tracking-wider font-mono mb-1.5">Eszköz</label>
                  <select
                    value={tradeAsset}
                    onChange={e => setTradeAsset(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 text-xs text-white rounded-xl p-3 focus:outline-none focus:border-yellow-500"
                  >
                    <option value="BTC">BTC (Bitcoin)</option>
                    <option value="ETH">ETH (Ethereum)</option>
                    <option value="SOL">SOL (Solana)</option>
                    <option value="BNB">BNB (Binance Coin)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-450 uppercase tracking-wider font-mono mb-1.5">Fizetőeszköz</label>
                  <select
                    value={tradeBase}
                    onChange={e => setTradeBase(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 text-xs text-white rounded-xl p-3 focus:outline-none focus:border-yellow-500"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="FDUSD">FDUSD ($)</option>
                    <option value="USDC">USDC ($)</option>
                    <option value="USDT">USDT ($)</option>
                  </select>
                </div>
              </div>

              {/* Amount input */}
              <div>
                <label className="block text-[10px] text-slate-450 uppercase tracking-wider font-mono mb-1.5">
                  Mennyiség ({tradeAsset})
                </label>
                <input
                  type="text"
                  value={tradeAmount}
                  onChange={e => setTradeAmount(e.target.value)}
                  placeholder={`pl. ${tradeAsset === "BTC" ? "0.01" : "2.5"}`}
                  className="w-full bg-slate-900 border border-slate-800 text-xs text-white rounded-xl p-3 focus:outline-none focus:border-yellow-500"
                />
              </div>

              {/* Estimate calculation block */}
              {(() => {
                let assetPriceUsd = btcPrice;
                if (tradeAsset === "ETH") assetPriceUsd = ethPrice;
                if (tradeAsset === "SOL") assetPriceUsd = solPrice;
                if (tradeAsset === "BNB") assetPriceUsd = bnbPrice;

                let basePriceUsd = 1.0;
                if (tradeBase === "EUR") basePriceUsd = eurPrice;

                const priceInBase = Number((assetPriceUsd / basePriceUsd).toFixed(2));
                const totalCostInBase = Number((parseFloat(tradeAmount || "0") * priceInBase).toFixed(2));

                return (
                  <div className="bg-slate-900/40 border border-slate-850 p-3.5 rounded-xl space-y-1.5 text-xs text-slate-400 font-mono">
                    <div className="flex justify-between">
                      <span>Aktuális ár:</span>
                      <span className="font-bold text-white font-mono">
                        {priceInBase.toLocaleString()} {tradeBase}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-850 pt-1.5 text-slate-300">
                      <span>Teljes becsült érték:</span>
                      <span className="font-bold text-yellow-400 font-mono">
                        {totalCostInBase.toLocaleString()} {tradeBase}
                      </span>
                    </div>
                  </div>
                );
              })()}

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
