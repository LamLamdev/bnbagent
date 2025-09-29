'use client';
import { useState } from 'react';
import TokenModal from "@/components/TokenModal";


// Utility functions for formatting
const formatNumber = (num) => {
  if (!num || num === 0) return '0';
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(2);
};

const formatBalance = (n) => {
  const num = Number(n);
  if (!isFinite(num) || num === 0) return '0';
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(2);
};


const formatUSD = (num) => {
  if (!num || num === 0) return '$0';
  return `$${formatNumber(num)}`;
};

const formatAddress = (address) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const formatTimeAgo = (minutes) => {
  if (!minutes) return 'Unknown';
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'}`;
};

const SafetyGauge = ({ score }) => {
  // Default to 50 if no score provided
  const safetyScore = score || 50;
  
  const getStatus = () => {
    if (safetyScore >= 85) return { color: 'text-emerald-400', bg: 'from-emerald-500/20 to-green-500/20', border: 'border-emerald-500/30', status: 'SECURE' };
    if (safetyScore >= 70) return { color: 'text-amber-400', bg: 'from-amber-500/20 to-orange-500/20', border: 'border-amber-500/30', status: 'CAUTION' };
    if (safetyScore >= 40) return { color: 'text-yellow-400', bg: 'from-yellow-500/20 to-amber-500/20', border: 'border-yellow-500/30', status: 'WARNING' };
    return { color: 'text-red-400', bg: 'from-red-500/20 to-pink-500/20', border: 'border-red-500/30', status: 'DANGER' };
  };

  const { color, bg, border, status } = getStatus();
  const circumference = 2 * Math.PI * 20;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (safetyScore / 100) * circumference;

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <svg width="50" height="50" className="transform -rotate-90">
          <circle
            cx="25"
            cy="25"
            r="20"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            className="text-gray-700/30"
          />
          <circle
            cx="25"
            cy="25"
            r="20"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className={`transition-all duration-1000 ease-out ${color}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-sm font-bold ${color}`}>{safetyScore}</span>
        </div>
      </div>
      <div>
        <div className={`text-xs font-semibold ${color} mb-1`}>{status}</div>
        <div className="text-gray-300 text-xs">Safety Score</div>
      </div>
    </div>
  );
};

const RiskIndicator = ({ label, value, type, tooltip }) => {
  const getRiskColor = (label, value) => {
    if (label === 'Honeypot') {
      return value ? 'text-red-400 bg-red-500/10' : 'text-emerald-400 bg-emerald-500/10';
    }
    if (type === 'percentage') {
      if (value === null || value === undefined) return 'text-gray-400 bg-gray-500/10';
      if (value > 50) return 'text-red-400 bg-red-500/10';
      if (value > 25) return 'text-yellow-400 bg-yellow-500/10';
      return 'text-emerald-400 bg-emerald-500/10';
    }
    return 'text-blue-400 bg-blue-500/10';
  };

  const displayValue = () => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'boolean') return value ? 'YES' : 'NO';
    if (type === 'percentage') return `${value}%`;
    return value;
  };

  return (
    <div 
      className={`px-2 py-2 rounded-lg border border-gray-600/50 backdrop-blur-sm ${getRiskColor(label, value)} transition-all duration-200 hover:scale-[1.02] cursor-help group relative`}
      title={tooltip}
    >
      <div className="text-xs font-medium text-gray-400 mb-1">{label}</div>
      <div className="font-bold text-xs">
        {displayValue()}
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
    </div>
  );
};

const MetricCard = ({ icon, label, primary, secondary, accent }) => (
  <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-lg p-3 border border-gray-600/30 backdrop-blur-sm hover:border-gray-500/50 transition-all duration-300 group relative overflow-hidden transform hover:scale-105">
    <div className="flex items-center gap-2 mb-2">
      <div className={`text-lg ${accent || 'text-blue-400'}`}>{icon}</div>
      <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</div>
    </div>
    <div className="space-y-1 relative z-10">
<div className={`text-sm font-bold ${accent && accent !== 'text-white' ? accent : 'text-white'}`}>{primary}</div>    </div>
    <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/10 to-yellow-500/0 opacity-100 group-hover:opacity-100 group-hover:animate-pulse group-hover:via-yellow-500/20 transition-all duration-300 rounded-lg"></div>
  </div>
);

// REPLACE your entire HolderDistribution with this:
const HolderDistribution = ({ total, topHolders = [] }) => {  const short = (addr = '') => (addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '—');
  const pct = (n) => (typeof n === 'number' && isFinite(n) ? `${n.toFixed(2)}%` : '—');
  const num = (n) => (typeof n === 'number' && isFinite(n) ? n.toLocaleString() : '—');

  if (!total && topHolders.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400">Holders</span>
          <span className="text-xs text-gray-500">0 total</span>
        </div>
        <div className="text-xs text-gray-500">No holder data available</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Total holders */}
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-400">Total Holders</span>
        <span className="text-xs font-medium text-gray-200">{num(total)}</span>
      </div>

      {/* Top 20 holders */}
      <div>
        <div className="text-xs mb-2 opacity-70">Top 10 Holders</div>
        <div className="rounded-lg border border-gray-600/30 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-black/20">
              <tr>
                <th className="text-left p-2">#</th>
                <th className="text-left p-2">Address</th>
                <th className="text-right p-2"> Supply %</th>
                <th className="text-right p-2">Balance</th>
                <th className="text-right p-2">Type</th>
              </tr>
            </thead>
            <tbody>
              {topHolders.map((h, i) => (
                <tr key={h.address || i} className="odd:bg-black/10">
                  <td className="p-2">{i + 1}</td>
                  <td className="p-2 font-mono">
  <a
    href={`https://bscscan.com/address/${h.address}`}
    target="_blank"
    rel="noopener noreferrer"
    className="text-bnb-yellow hover:underline"
  >
    {short(h.address)}
  </a>
</td>

                  <td className="p-2 text-right">{pct(h.percentage)}</td>
<td className="p-2 text-right">{formatBalance(h.balance ?? h.balanceRaw)}</td>                  <td className="p-2 text-right">{h.isContract ? 'Contract' : 'Wallet'}</td>
                </tr>
              ))}
              {topHolders.length === 0 && (
                <tr>
                  <td className="p-2 text-center opacity-70" colSpan={5}>
                    No holders to display.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category distribution */}
      
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 bg-gray-700/50 rounded-full"></div>
      <div className="space-y-2 flex-1">
        <div className="h-4 bg-gray-700/50 rounded w-2/3"></div>
        <div className="h-3 bg-gray-700/50 rounded w-1/2"></div>
      </div>
    </div>
    
    <div className="grid grid-cols-3 gap-2">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-12 bg-gray-700/30 rounded-lg"></div>
      ))}
    </div>
    
    <div className="grid grid-cols-2 gap-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-16 bg-gray-700/30 rounded-lg"></div>
      ))}
    </div>
    
    <div className="space-y-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-6 h-1.5 bg-gray-700/50 rounded-full"></div>
          <div className="flex-1 h-1.5 bg-gray-700/30 rounded-full"></div>
          <div className="w-8 h-3 bg-gray-700/50 rounded"></div>
        </div>
      ))}
    </div>
  </div>
);

// add this helper above the return in TokenIntelCard (or in a utils file)
const makeXSearchUrl = (contract, symbol) => {
  const cleanSymbol = (symbol || '').toString().replace(/^\$+/, '').trim();
  const hasSymbol = cleanSymbol.length > 0;
  const query = hasSymbol ? `(${contract} OR $${cleanSymbol})` : `${contract}`;
  const params = new URLSearchParams({
    q: query,
    src: 'typed_query',
    f: 'live',           // show latest
  });
  return `https://x.com/search?${params.toString()}`;
};


const TokenIntelCard = ({ data, loading, error }) => {
  const [copied, setCopied] = useState(false);

 const copyAddress = () => {
  if (!data || !data.contract) {
    console.warn('No contract address to copy');
    return;
  }
  
  // Check if clipboard API is available
  if (!navigator?.clipboard) {
    console.error('Clipboard API not available');
    // Fallback: create a temporary input element
    const input = document.createElement('input');
    input.value = data.contract;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    return;
  }
  
  navigator.clipboard.writeText(data.contract)
    .then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    })
    .catch(err => {
      console.error('Failed to copy:', err);
    });
};


const searchUrl = makeXSearchUrl(data.contract, data.symbol);
  return (
    <div className="space-y-4 relative">
      {/* Animated background elements - subtle for integration */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/20 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-500/20 rounded-full blur-xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>
      
   <div className="relative z-10">
  {/* Header Section */}
  <div className="flex items-start justify-between mb-4">
    <div className="space-y-2">
      <h3 className="text-lg font-bold text-white leading-tight">
        {data.tokenName || 'Unknown Token'}
        <span className="text-sm text-gray-400 ml-2">${data.symbol || 'UNKNOWN'}</span>
      </h3>
      <div className="flex items-center gap-2">
        <button
          onClick={copyAddress}
          className="inline-flex items-center gap-2 px-2 py-1 bg-gray-700/50 rounded border border-gray-600/50 cursor-pointer hover:bg-gray-600/50 transition-all duration-200 group"
        >
          <span className="text-xs font-mono text-gray-300">{formatAddress(data.contract)}</span>
          <div className="w-3 h-3 text-gray-400 group-hover:text-yellow-400 transition-colors">📋</div>
          {copied && (
            <span className="text-xs text-emerald-400">✓</span>
          )}
        </button>
        <div className="inline-block px-2 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-full text-xs font-medium text-yellow-300">
          {data.chain || 'BNB'}
        </div>
      </div>
    </div>
    <SafetyGauge score={data.safetyScore} />
  </div>

        {/* Risk Indicators */}
        <div className="space-y-2 mb-4">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Risk Assessment</h4>
          <div className="grid grid-cols-3 gap-2">
            <RiskIndicator 
              label="Bundlers" 
              value={data.bundlersPct} 
              type="percentage"
              tooltip="Percentage of transactions from MEV bundlers"
            />
            <RiskIndicator 
              label="Honeypot" 
              value={data.honeypot}
              tooltip="Whether the token prevents selling"
            />
            <RiskIndicator 
              label="Rug Risk" 
              value={data.rugRatioPct} 
              type="percentage"
              tooltip="Probability of rug pull based on liquidity and ownership"
            />
          </div>
        </div>

        

        {/* Market Metrics */}
        <div className="space-y-2 mb-4">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Market Data</h4>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard 
              icon="💎" 
              label="Market Cap" 
              primary={formatUSD(data.mcUSD)}
            
            />
            <MetricCard 
              icon="💧" 
              label="Liquidity" 
              primary={formatUSD(data.liquidityUSD)}
              secondary={data.lpLockPct ? `${data.lpLockPct}% locked in ${data.lpLockDest}` : null}
              accent="text-blue-400"
            />
            <MetricCard 
              icon="📈" 
              label="24h Volume" 
              primary={formatUSD(data.volume24hUSD)}
             
            />
            <MetricCard 
  icon="📊" 
  label="24h Change" 
  primary={data.priceChange24h ? `${data.priceChange24h > 0 ? '+' : ''}${data.priceChange24h.toFixed(2)}%` : 'N/A'}
  accent={data.priceChange24h > 0 ? "text-green-400" : data.priceChange24h < 0 ? "text-red-400" : "text-gray-400"}
/>
            <MetricCard 
              icon="⏰" 
              label="Token Age" 
              primary={formatTimeAgo(data.ageMinutes)}
              
            />
           <MetricCard 
  icon="🔄" 
  label="Vol/Liq Activity" 
  primary={data.volLiqRatio ? `${data.volLiqRatio}%` : 'N/A'}
  accent={data.volLiqRatio > 50 ? "text-green-400" : data.volLiqRatio > 20 ? "text-yellow-400" : "text-red-400"}
/>
          </div>
        </div>

        {/* Holder Analysis */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Holder Analysis</h4>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">Dev:</span>
              <div className="flex items-center gap-1">
                <span className="text-xs">{data.holders?.devSold ? '🔴' : '🟢'}</span>
                <span className="text-xs text-gray-400">{data.holders?.devTokens || 'N/A'}</span>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-lg p-3 border border-gray-600/30">
           <HolderDistribution
  total={data?.holders?.total}
  topHolders={data?.holders?.topHolders || []}
  categories={data?.holders?.categories || null}
/>

          </div>
        </div>

        {/* Four Meme Info */}
        {data.isFourMemeToken && (
          <div className="space-y-2 mb-4">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Four Meme Status</h4>
            <div className="grid grid-cols-2 gap-3">
              <MetricCard 
                icon="🚀" 
                label="Migration" 
                primary={data.migrationStatus || 'Unknown'}
                accent="text-blue-400"
              />
              <MetricCard 
                icon="📊" 
                label="Bonding Curve" 
                primary={data.bondingCurveProgress ? `${data.bondingCurveProgress.toFixed(1)}%` : 'N/A'}
                accent="text-green-400"
              />
            </div>
          </div>
        )}

        {/* Action Button */}
        <div>
          <a 
            href={searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-semibold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-[1.02] text-sm"
          >
            <span>🔍</span>
            <span>Search on X</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default function IntelPage() {
  const [contract, setContract] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const isValidAddress = (address) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const handleAnalyze = async (address) => {
    if (!address.trim()) {
      setData(null);
      setError('');
      return;
    }
    
    if (!isValidAddress(address)) {
      setError('Invalid BNB contract address');
      setData(null);
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/token-intel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tokenAddress: address }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to analyze token');
      }

      if (result.success && result.data) {
        setData(result.data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Token analysis error:', err);
      setError(err.message || 'Failed to analyze token. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAnalyze(contract);
    }
  };

  const handleInputChange = (e) => {
    setContract(e.target.value);
    // Clear data if input is empty
    if (!e.target.value.trim()) {
      setData(null);
      setError('');
      setLoading(false);
    }
  };

  const showAnalyzeButton = contract.trim() && !data && !loading && !error;

  return (
    <div className="flex justify-center items-start min-h-screen pt-48 gap-6 px-4">
      {/* Main Intel Card - centered with original sizing */}
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[var(--panel)] p-6 shadow-xl" style={{width: '32rem'}}>
        <h2 className="text-xl font-semibold mb-4">Token Intel Brief</h2>
        <input
          value={contract}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="Paste contract (0x…)"
          className="w-full bg-transparent border border-white/10 rounded px-3 py-2 mb-4 placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-bnb-yellow"
        />
        
        {/* Analyze Button */}
        {showAnalyzeButton && (
          <button
            onClick={() => handleAnalyze(contract)}
            className="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-semibold py-2 px-6 rounded-lg transition-all duration-300 transform hover:scale-[1.02] mb-4 text-sm mx-auto block"
          >
            Analyze
          </button>
        )}
        
        {/* Intel Card Content */}
        <div className="min-h-0 text-center">
          {!contract.trim() && !data && !loading && !error && (
            <div className="text-bnb-yellow/70 text-sm">
              Advanced DeFi Risk Analysis
            </div>
          )}
          <TokenIntelCard data={data} loading={loading} error={error} />
        </div>
      </div>
  </div>
)}