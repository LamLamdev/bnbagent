// services/dexToolsService.js

class DEXToolsService {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.DEXTOOLS_API_KEY;
    this.baseUrl = 'https://public-api.dextools.io/v2';
    this.chainMapping = {
      'bsc': 'bnb',
      'ethereum': 'ether',
      'polygon': 'polygon',
      'arbitrum': 'arbitrum'
    };
    
    if (!this.apiKey) {
      console.error('No DEXTools API key provided');
      throw new Error('DEXTools API key is required');
    }
  }

  // Map common chain names to DEXTools format
  getChainName(chainId) {
    const chainName = typeof chainId === 'string' ? chainId.toLowerCase() : 'bsc';
    return this.chainMapping[chainName] || 'bnb'; // Default to BSC
  }

  // Get comprehensive token data including holder information
  async getTokenData(contractAddress, chainId = 'bsc') {
    try {
      const chain = this.getChainName(chainId);
      const url = `${this.baseUrl}/token/${chain}/${contractAddress}`;
      
      console.log(`DEXTools: Getting token data for ${contractAddress} on ${chain}`);
      console.log(`DEXTools URL: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'X-API-Key': this.apiKey,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      const data = await response.json();
      console.log('DEXTools token response:', JSON.stringify(data, null, 2));
      
      if (data.statusCode !== 200 || !data.data) {
        throw new Error(data.message || 'Failed to get token data from DEXTools');
      }

      return this.parseTokenData(data.data);

    } catch (error) {
      console.error('Error getting DEXTools token data:', error);
      return null;
    }
  }

  // Get additional token information (social links, etc.)
  async getTokenInfo(contractAddress, chainId = 'bsc') {
    try {
      const chain = this.getChainName(chainId);
      const url = `${this.baseUrl}/token/${chain}/${contractAddress}/info`;
      
      console.log(`DEXTools: Getting token info for ${contractAddress}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'X-API-Key': this.apiKey,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      const data = await response.json();
      console.log('DEXTools info response:', data);
      
      if (data.statusCode === 200 && data.data) {
        return data.data;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting DEXTools token info:', error);
      return null;
    }
  }

  // Get token score/audit information
  async getTokenScore(contractAddress, chainId = 'bsc') {
    try {
      const chain = this.getChainName(chainId);
      const url = `${this.baseUrl}/token/${chain}/${contractAddress}/score`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'X-API-KEY': this.apiKey
        }
      });

      const data = await response.json();
      console.log('DEXTools score response:', data);
      
      if (data.statusCode === 200 && data.data) {
        return data.data;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting DEXTools token score:', error);
      return null;
    }
  }

  // Parse and format token data from DEXTools response
  parseTokenData(tokenData) {
    try {
      // DEXTools response structure may vary, let's handle multiple formats
      const token = tokenData;
      
      return {
        // Basic token info
        name: token.name || 'Unknown',
        symbol: token.symbol || 'UNKNOWN',
        address: token.address,
        
        // Market data
        price: parseFloat(token.price || 0),
        marketCap: token.mcap || token.marketCap || null,
        liquidity: token.liquidity || null,
        volume24h: token.volume24h || token.volume?.h24 || null,
        priceChange24h: token.priceChange24h || token.priceChange?.h24 || null,
        
        // Holder data (this is what we're looking for!)
        holders: token.holders || null,
        holderCount: token.holderCount || token.holders || null,
        
        // Risk/Security data
        dextScore: token.dextScore || token.score || null,
        audit: token.audit || null,
        locks: token.locks || null,
        
        // Social/Info data
        website: token.website || null,
        social: token.social || null,
        
        // DEXTools specific
        creationTime: token.creationTime || null,
        creationBlock: token.creationBlock || null,
        
        // Raw data for debugging
        _raw: token
      };
    } catch (error) {
      console.error('Error parsing DEXTools token data:', error);
      return null;
    }
  }

  // Get complete holder analysis using DEXTools data
  async getCompleteHolderAnalysis(contractAddress, chainId = 'bsc') {
    try {
      console.log(`Getting complete holder analysis from DEXTools for ${contractAddress}...`);
      
      // Get token data and additional info in parallel
      const [tokenData, tokenInfo, tokenScore] = await Promise.all([
        this.getTokenData(contractAddress, chainId),
        this.getTokenInfo(contractAddress, chainId),
        this.getTokenScore(contractAddress, chainId)
      ]);

      if (!tokenData) {
        return {
          error: 'Failed to get token data from DEXTools',
          totalHolders: 0,
          devWallets: 0,
          topHolders: [],
          percentages: { top3Combined: 0, top10Combined: 0, top20Combined: 0 },
          dataQuality: 'Error'
        };
      }

      // Extract holder information
      const holderCount = tokenData.holderCount || tokenData.holders || 0;
      const dextScore = tokenScore?.dextScore || tokenData.dextScore || null;
      
      // Calculate estimated dev wallets based on DextScore and other factors
      let devWalletsEstimate = 0;
      if (dextScore !== null) {
        // Lower DextScore often indicates more centralization
        if (dextScore < 50) devWalletsEstimate = Math.floor(holderCount * 0.05); // 5% if low score
        else if (dextScore < 70) devWalletsEstimate = Math.floor(holderCount * 0.03); // 3% if medium
        else devWalletsEstimate = Math.floor(holderCount * 0.01); // 1% if high score
      } else {
        // Fallback estimate
        devWalletsEstimate = Math.floor(holderCount * 0.03);
      }

      // Estimate percentages based on typical distribution patterns
      let percentages = { top3Combined: 0, top10Combined: 0, top20Combined: 0 };
      
      if (holderCount > 0) {
        // Estimate based on holder count - more holders usually means better distribution
        if (holderCount < 100) {
          percentages = { top3Combined: 45, top10Combined: 70, top20Combined: 85 };
        } else if (holderCount < 500) {
          percentages = { top3Combined: 25, top10Combined: 45, top20Combined: 65 };
        } else if (holderCount < 1000) {
          percentages = { top3Combined: 15, top10Combined: 30, top20Combined: 50 };
        } else if (holderCount < 5000) {
          percentages = { top3Combined: 10, top10Combined: 20, top20Combined: 35 };
        } else {
          percentages = { top3Combined: 5, top10Combined: 12, top20Combined: 25 };
        }
        
        // Adjust based on DextScore if available
        if (dextScore !== null) {
          const scoreMultiplier = dextScore < 50 ? 1.3 : dextScore > 80 ? 0.7 : 1.0;
          percentages.top3Combined *= scoreMultiplier;
          percentages.top10Combined *= scoreMultiplier;
          percentages.top20Combined *= scoreMultiplier;
        }
      }

      return {
        totalHolders: holderCount,
        devWallets: devWalletsEstimate,
        topHolders: [], // DEXTools might not provide individual holder addresses
        percentages: {
          top3Combined: Math.round(percentages.top3Combined * 100) / 100,
          top10Combined: Math.round(percentages.top10Combined * 100) / 100,
          top20Combined: Math.round(percentages.top20Combined * 100) / 100
        },
        dextScore: dextScore,
        totalSupply: tokenData.totalSupply || null,
        lastUpdated: new Date().toISOString(),
        dataQuality: holderCount > 0 ? 'High' : 'Limited',
        isEstimated: percentages.top3Combined > 0 ? true : false,
        dataSource: 'DEXTools',
        tokenInfo: {
          name: tokenData.name,
          symbol: tokenData.symbol,
          price: tokenData.price,
          marketCap: tokenData.marketCap,
          liquidity: tokenData.liquidity
        }
      };

    } catch (error) {
      console.error('Error in DEXTools holder analysis:', error);
      return {
        error: error.message,
        totalHolders: 0,
        devWallets: 0,
        topHolders: [],
        percentages: { top3Combined: 0, top10Combined: 0, top20Combined: 0 },
        dataQuality: 'Error'
      };
    }
  }

  // Test API connection
  async testConnection() {
    try {
      const testUrl = `${this.baseUrl}/token/bnb/0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82`; // CAKE token
      console.log('Testing DEXTools connection...');
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'X-API-KEY': this.apiKey
        }
      });

      const data = await response.json();
      console.log('DEXTools connection test result:', data);
      
      return data.statusCode === 200;
    } catch (error) {
      console.error('DEXTools connection test failed:', error);
      return false;
    }
  }
}

export default DEXToolsService;