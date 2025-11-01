// app/api/services/dexScreenerService.js

const DEXSCREENER_BASE_URL = 'https://api.dexscreener.com/latest/dex';

export class DexScreenerService {
  async getTokenData(tokenAddress, chainId = 'solana') {
    try {
      // Use the correct endpoint: /latest/dex/tokens/{tokenAddress}
      const url = `${DEXSCREENER_BASE_URL}/tokens/${tokenAddress}`;
      console.log('DEXScreener: Calling URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });
      
      console.log('DEXScreener: Response status:', response.status);

      if (!response.ok) {
        throw new Error(`DexScreener API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('DEXScreener raw response:', JSON.stringify(data, null, 2));

      // Response format: { schemaVersion, pairs: [...] }
      if (!data || !data.pairs || data.pairs.length === 0) {
        console.log('No pairs found in DEXScreener response');
        return null;
      }

      // Filter for the correct chain
      const chainPairs = data.pairs.filter(pair => 
        pair.chainId.toLowerCase() === chainId.toLowerCase()
      );

      if (chainPairs.length === 0) {
        console.log(`No pairs found for chain: ${chainId}`);
        return null;
      }

      // Get the main trading pair (highest liquidity)
      const mainPair = chainPairs.reduce((best, current) => {
        const currentLiq = current.liquidity?.usd || 0;
        const bestLiq = best.liquidity?.usd || 0;
        return currentLiq > bestLiq ? current : best;
      }, chainPairs[0]);

      console.log('Selected main pair:', {
        dex: mainPair.dexId,
        liquidity: mainPair.liquidity?.usd,
        chainId: mainPair.chainId
      });

      return this.formatDexScreenerData(mainPair);
    } catch (error) {
      console.error('DexScreener API error:', error);
      return null;
    }
  }

  formatDexScreenerData(pair) {
    return {
      // Market Data
      marketCap: pair.marketCap || pair.fdv || null,
      fdv: pair.fdv || null,
      liquidity: pair.liquidity?.usd || null,
      price: parseFloat(pair.priceUsd) || null,
      
      // Volume Data
      volume24h: pair.volume?.h24 || null,
      volume6h: pair.volume?.h6 || null,
      volume1h: pair.volume?.h1 || null,
      
      // Price Changes
      priceChange24h: pair.priceChange?.h24 || null,
      priceChange6h: pair.priceChange?.h6 || null,
      priceChange1h: pair.priceChange?.h1 || null,
      
      // Transaction Data
      txns24h: pair.txns?.h24 || null,
      txns6h: pair.txns?.h6 || null,
      txns1h: pair.txns?.h1 || null,
      
      // Trading Activity
      buys24h: pair.txns?.h24?.buys || null,
      sells24h: pair.txns?.h24?.sells || null,
      buyers24h: pair.txns?.h24?.buyers || null,
      sellers24h: pair.txns?.h24?.sellers || null,
      trades24h: (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0),
      
      // Token Info
      tokenName: pair.baseToken?.name || null,
      tokenSymbol: pair.baseToken?.symbol || null,
      tokenAddress: pair.baseToken?.address || null,
      
      // Pair Info
      pairAddress: pair.pairAddress || null,
      pairCreatedAt: pair.pairCreatedAt || null,
      dexId: pair.dexId || null,
      chainId: pair.chainId || null,
      
      // Social & Info
      info: {
        imageUrl: pair.info?.imageUrl || null,
        websites: pair.info?.websites || [],
        socials: pair.info?.socials || []
      },
      
      // Data source
      dataSource: 'dexscreener',
      
      // Raw data for debugging
      _raw: pair
    };
  }

  async searchToken(query) {
    try {
      const response = await fetch(
        `${DEXSCREENER_BASE_URL}/search?q=${encodeURIComponent(query)}`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`DexScreener search error: ${response.status}`);
      }

      const data = await response.json();
      return data.pairs || [];
    } catch (error) {
      console.error('DexScreener search error:', error);
      throw error;
    }
  }

  // Get multiple chains data for a token
  async getTokenDataAllChains(tokenAddress) {
    try {
      const url = `${DEXSCREENER_BASE_URL}/tokens/${tokenAddress}`;
      console.log('DEXScreener: Getting all chains for token:', tokenAddress);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`DexScreener API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data || !data.pairs || data.pairs.length === 0) {
        return null;
      }

      // Group pairs by chain
      const pairsByChain = {};
      data.pairs.forEach(pair => {
        const chain = pair.chainId;
        if (!pairsByChain[chain]) {
          pairsByChain[chain] = [];
        }
        pairsByChain[chain].push(pair);
      });

      return pairsByChain;
    } catch (error) {
      console.error('DexScreener all chains error:', error);
      return null;
    }
  }
}