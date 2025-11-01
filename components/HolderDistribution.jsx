// components/HolderDistribution.jsx
const HolderDistribution = ({ total, topHolders = [], chain = 'Solana' }) => {
  if (!total && (!topHolders || topHolders.length === 0)) {
    return (
      <div className="text-sm opacity-70">
        No holder data available.
      </div>
    );
  }

  const short = (addr = '') =>
    addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '—';

  const pct = (n) =>
    typeof n === 'number' && isFinite(n) ? `${n.toFixed(2)}%` : '—';

  const num = (n) =>
    typeof n === 'number' && isFinite(n) ? n.toLocaleString() : '—';

  // Format balance based on chain and value
  const formatBalance = (balance) => {
    if (!balance) return '—';
    
    // Handle string numbers
    const numBalance = typeof balance === 'string' ? parseFloat(balance) : balance;
    
    if (!isFinite(numBalance) || numBalance === 0) return '—';
    
    // Format large numbers
    if (numBalance >= 1e9) return `${(numBalance / 1e9).toFixed(2)}B`;
    if (numBalance >= 1e6) return `${(numBalance / 1e6).toFixed(2)}M`;
    if (numBalance >= 1e3) return `${(numBalance / 1e3).toFixed(2)}K`;
    
    return numBalance.toFixed(2);
  };

  // Get explorer URL based on chain
  const getExplorerUrl = (address) => {
    if (chain.toLowerCase() === 'solana') {
      return `https://solscan.io/address/${address}`;
    }
    // Default to BSCScan for BNB/BSC
    return `https://bscscan.com/address/${address}`;
  };

  // Get chain color
  const getChainColor = () => {
    if (chain.toLowerCase() === 'solana') {
      return 'text-purple-400 hover:text-purple-300';
    }
    return 'text-bnb-yellow hover:text-bnb-yellow/80';
  };

  return (
    <div className="space-y-4">
      {/* Total holders */}
      <div className="text-sm">
        <span className="opacity-70">Total holders: </span>
        <span className="font-medium">{num(total)}</span>
      </div>

      {/* Top 20 holders */}
      <div>
        <div className="text-sm mb-2 opacity-70">Top 20 holders</div>
        <div className="rounded-lg border border-gray-600/30 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-black/20">
              <tr>
                <th className="text-left p-2">#</th>
                <th className="text-left p-2">Address</th>
                <th className="text-right p-2">Supply %</th>
                <th className="text-right p-2">Balance</th>
                <th className="text-right p-2">Type</th>
              </tr>
            </thead>
            <tbody>
              {topHolders.map((h, i) => (
                <tr key={h.address || i} className="odd:bg-black/10 hover:bg-white/5 transition-colors">
                  <td className="p-2">{i + 1}</td>
                  <td className="p-2 font-mono">
                    <a
                      href={getExplorerUrl(h.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${getChainColor()} hover:underline`}
                      title={h.address}
                    >
                      {short(h.address)}
                    </a>
                  </td>
                  <td className="p-2 text-right font-medium">
                    {pct(h.percentage)}
                  </td>
                  <td className="p-2 text-right">
                    {formatBalance(h.balance)}
                  </td>
                  <td className="p-2 text-right">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      h.isContract 
                        ? 'bg-orange-500/20 text-orange-300' 
                        : 'bg-blue-500/20 text-blue-300'
                    }`}>
                      {h.isContract ? 'Contract' : 'Wallet'}
                    </span>
                  </td>
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

      {/* Distribution info */}
      {topHolders.length > 0 && (
        <div className="text-xs opacity-60 mt-2">
          Showing top {Math.min(topHolders.length, 20)} holders
          {chain === 'Solana' && ' • Solana holder data may be limited'}
        </div>
      )}
    </div>
  );
};

export default HolderDistribution;