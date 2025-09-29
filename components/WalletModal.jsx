'use client';

export default function WalletModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-[92vw] max-w-md rounded-xl border border-gray-700 bg-[#1e1e1e] p-5 text-sm shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-white">Wallet Analyzer</h3>
          <button onClick={onClose} className="h-8 w-8 rounded hover:bg-gray-700">✕</button>
        </div>
        <input
          className="w-full bg-transparent border border-gray-700 rounded px-3 py-2 mb-3 placeholder:text-gray-500 text-white focus:border-bnb-yellow outline-none"
          placeholder="Paste wallet address (0x…)"
        />
        <div className="text-gray-400">Mock modal — wire real UI later.</div>
      </div>
    </div>
  );
}
