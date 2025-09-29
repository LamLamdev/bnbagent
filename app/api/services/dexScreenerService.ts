// app/api/services/dexScreenerService.js

const DEXSCREENER_BASE_URL = 'https://api.dexscreener.com';

export class DexScreenerService {
 async getTokenData(tokenAddress, chainId = 'bsc') {
  try {
    const url = `${DEXSCREENER_BASE_URL}/tokens/v1/${chainId}/${tokenAddress}`;
    console.log('Calling URL:', url);
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    console.log('Response status:', response.status);

if (!response.ok) {
  throw new Error(`DexScreener API error: ${response.status}`);
}

const data = await response.json();
console.log('DEXScreener raw response:', JSON.stringify(data, null, 2));

if (!data || data.length === 0) {
  console.log('No pairs found in DEXScreener response');
  return null;
}

      // Get the main trading pair (usually highest volume)
      const mainPair = data[0];

      return this.formatDexScreenerData(mainPair);
    } catch (error) {
      console.error('DexScreener API error:', error);
      throw error;
    }
  }

  formatDexScreenerData(pair) {
    return {
      // Market Data
      marketCap: pair.marketCap || null,
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
      
      // Token Info
      tokenName: pair.baseToken?.name || null,
      tokenSymbol: pair.baseToken?.symbol || null,
      tokenAddress: pair.baseToken?.address || null,
      
      // Pair Info
      pairAddress: pair.pairAddress || null,
      pairCreatedAt: pair.pairCreatedAt || null,
      dexId: pair.dexId || null,
      
      // Social & Info
      info: {
        imageUrl: pair.info?.imageUrl || null,
        websites: pair.info?.websites || [],
        socials: pair.info?.socials || []
      },
      
      // Raw data for debugging
      _raw: pair
    };
  }

  async searchToken(query) {
    try {
      const response = await fetch(
        `${DEXSCREENER_BASE_URL}/latest/dex/search?q=${encodeURIComponent(query)}`,
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
}