// components/HolderDistribution.jsx
const HolderDistribution = ({ total, topHolders = [] }) => {  if (!total && (!topHolders || topHolders.length === 0)) {
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
      <td className="p-2 text-right">{formatNumber(h.balance)}</td>
      <td className="p-2 text-right">
         <td>{h.balance}</td>   // 👈 right here
        {h.isContract ? 'Contract' : 'Wallet'}
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

      {/* Category distribution */}

    </div>
  );
}
