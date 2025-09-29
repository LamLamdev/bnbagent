// components/CommunitySentiment.js
'use client';
import { useState, useEffect } from 'react';

const CommunitySentiment = ({ ticker, contract, className = "" }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    if (!contract) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ contract });
      if (ticker) params.set('ticker', ticker);
      
      const response = await fetch(`/api/community?${params.toString()}`, {
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [ticker, contract]);

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getLastUpdatedText = () => {
    if (!data?.lastUpdatedISO) return '';
    const minutes = Math.floor((Date.now() - new Date(data.lastUpdatedISO).getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const BullScoreGauge = ({ score, loading }) => {
    const getScoreColor = () => {
      if (loading) return 'text-gray-400';
      if (score >= 70) return 'text-emerald-400';
      if (score >= 40) return 'text-yellow-400';
      return 'text-red-400';
    };

    const circumference = 2 * Math.PI * 18;
    const strokeDasharray = circumference;
    const strokeDashoffset = loading ? circumference : circumference - (score / 100) * circumference;

    return (
      <div className="flex items-center gap-2">
        <div className="relative">
          <svg width="45" height="45" className="transform -rotate-90">
            <circle
              cx="22.5"
              cy="22.5"
              r="18"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              className="text-gray-700/30"
            />
            <circle
              cx="22.5"
              cy="22.5"
              r="18"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className={`transition-all duration-1000 ease-out ${getScoreColor()}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-xs font-bold ${getScoreColor()}`}>
              {loading ? '—' : score}
            </span>
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-400">Bull Score</div>
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl p-4 border border-gray-600/30 backdrop-blur-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Community Sentiment</h3>
        <button
          onClick={fetchData}
          disabled={loading}
          className="text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Metrics */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-sm text-gray-400">
              24H Mentions: {loading ? '—' : formatNumber(data?.mentions24h || 0)}
            </div>
            <div className="text-sm text-gray-400">
              24H Engagement: {loading ? '—' : formatNumber(data?.engagement24h || 0)}
            </div>
          </div>
          <BullScoreGauge score={data?.bullScore || 50} loading={loading} />
        </div>
        
        {/* Sentiment Breakdown */}
        {data?.sentimentBreakdown && !loading && (
          <div className="bg-gray-700/30 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-2">Sentiment Breakdown</div>
            <div className="flex justify-between text-xs">
              <span className="text-green-400">
                Bullish: {data.sentimentBreakdown.pos || 0}
              </span>
              <span className="text-gray-400">
                Neutral: {data.sentimentBreakdown.neu || 0}
              </span>
              <span className="text-red-400">
                Bearish: {data.sentimentBreakdown.neg || 0}
              </span>
            </div>
          </div>
        )}
        
        {data?.lastUpdatedISO && (
          <div className="text-xs text-gray-500">
            Updated {getLastUpdatedText()}
            {data._reason && <span className="text-yellow-400 ml-2">({data._reason})</span>}
            {data._cached && <span className="text-blue-400 ml-1">(cached)</span>}
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="text-red-400 text-sm p-3 bg-red-500/10 rounded-lg border border-red-500/20 mb-4">
          ⚠️ {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-gray-800/50 border border-gray-600/30 rounded-lg p-4 animate-pulse">
          <div className="space-y-2">
            <div className="h-3 bg-gray-700 rounded w-3/4"></div>
            <div className="h-3 bg-gray-700 rounded w-1/2"></div>
            <div className="h-3 bg-gray-700 rounded w-2/3"></div>
          </div>
        </div>
      )}

      {/* Data Source Info */}
      {data && !loading && (
        <div className="mt-4 p-3 bg-gray-700/20 rounded-lg">
          <div className="text-xs text-gray-500 space-y-1">
            <div>Source: {data._source === 'twitter' ? 'Twitter API' : 'Mock Data'}</div>
            {data._totalTweetsFound !== undefined && (
              <div>Found: {data._totalTweetsFound} tweets, processed: {data._validTweetsProcessed}</div>
            )}
            {data._source === 'mock' && (
              <div className="text-yellow-400">Using simulated data</div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && data?.mentions24h === 0 && (
        <div className="text-center py-6 text-gray-400">
          <div className="text-sm mb-2">No recent mentions found</div>
          <div className="text-xs">
            Contract: {contract.slice(0, 6)}...{contract.slice(-4)}
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunitySentiment;