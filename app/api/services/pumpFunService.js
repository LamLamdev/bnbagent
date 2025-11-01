// app/api/services/pumpFunService.js

export class PumpFunService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    // Pump.fun doesn't have an official public API yet
    // We'll use on-chain data or third-party APIs
    this.baseUrl = 'https://frontend-api.pump.fun'; // Example
    this.pumpProgramId = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P'; // Pump.fun program ID
  }

  async getTokenData(tokenAddress) {
    try {
      console.log(`PumpFun: Checking if ${tokenAddress} is a Pump.fun token...`);

      // Method 1: Try Pump.fun API (if available)
      try {
        const apiData = await this.fetchFromPumpAPI(tokenAddress);
        if (apiData) {
          console.log('✅ PumpFun: Token found via API');
          return this.formatPumpFunData(apiData);
        }
      } catch (error) {
        console.log('⚠️ PumpFun API unavailable:', error.message);
      }

      // Method 2: Check on-chain data (fallback)
      // For now, return null if API fails
      console.log('❌ PumpFun: Token not found or not a Pump.fun token');
      return null;

    } catch (error) {
      console.error('PumpFun service error:', error);
      return null;
    }
  }

  async fetchFromPumpAPI(tokenAddress) {
    try {
      // Try to fetch from Pump.fun's frontend API
      const url = `${this.baseUrl}/coins/${tokenAddress}`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        }
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.log('PumpFun API fetch failed:', error.message);
      return null;
    }
  }

  formatPumpFunData(data) {
    // Format Pump.fun data to match our standard format
    const isGraduated = data.raydium_pool !== null && data.raydium_pool !== undefined;
    const bondingProgress = data.progress || 0;

    return {
      // Token Info
      tokenName: data.name || 'Unknown',
      tokenSymbol: data.symbol || 'UNKNOWN',
      tokenAddress: data.mint || data.address,
      
      // Pump.fun Specific
      bondingCurveProgress: bondingProgress,
      isGraduated: isGraduated,
      
      // Market Data (if available)
      marketCap: data.market_cap || data.usd_market_cap || null,
      liquidity: isGraduated ? data.virtual_sol_reserves : null,
      price: data.price_per_token || null,
      
      // Volume & Activity
      volume24h: data.volume_24h || null,
      trades24h: data.txn_count_24h || null,
      buyers24h: data.buyer_count_24h || null,
      sellers24h: data.seller_count_24h || null,
      
      // Creation Info
      createdAt: data.created_timestamp || data.created_at || null,
      creator: data.creator || null,
      
      // Social
      description: data.description || null,
      twitter: data.twitter || null,
      telegram: data.telegram || null,
      website: data.website || null,
      
      // Metadata
      dataSource: 'pumpfun',
      isPumpFunToken: true,
      
      // Raw for debugging
      _raw: data
    };
  }

  // Helper: Check if token is a Pump.fun token by checking program
  async isPumpFunToken(tokenAddress) {
    try {
      const data = await this.getTokenData(tokenAddress);
      return data !== null;
    } catch (error) {
      return false;
    }
  }

  // Helper: Get bonding curve progress
  async getBondingCurveProgress(tokenAddress) {
    try {
      const data = await this.getTokenData(tokenAddress);
      return data?.bondingCurveProgress || 0;
    } catch (error) {
      return 0;
    }
  }

  // Helper: Check if graduated to Raydium
  async hasGraduated(tokenAddress) {
    try {
      const data = await this.getTokenData(tokenAddress);
      return data?.isGraduated || false;
    } catch (error) {
      return false;
    }
  }
}

export default PumpFunService;