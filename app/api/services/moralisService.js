// services/moralisService.js

class MoralisService {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.MORALIS_API_KEY;
    this.baseUrl = 'https://deep-index.moralis.io/api/v2.2';

    // Chain mapping for Moralis
    this.chainMapping = {
      // EVM Chains
      bsc: '0x38',
      ethereum: '0x1',
      polygon: '0x89',
      arbitrum: '0xa4b1',
      avalanche: '0xa86a',
      // Solana
      solana: 'mainnet',
      'solana-mainnet': 'mainnet',
      'solana-devnet': 'devnet',
      'solana-testnet': 'testnet',
    };

    if (!this.apiKey) {
      console.error('No Moralis API key provided');
      throw new Error('Moralis API key is required');
    }
  }

  // Map chain names to Moralis chain IDs
  getChainId(chainId) {
    const chainName = typeof chainId === 'string' ? chainId.toLowerCase() : 'solana';
    return this.chainMapping[chainName] || 'mainnet'; // Default to Solana mainnet
  }

  // Detect if chain is Solana or EVM
  isSolanaChain(chainId) {
    const chain = this.getChainId(chainId);
    return chain === 'mainnet' || chain === 'devnet' || chain === 'testnet';
  }

  // Get token holders (list of owners) — ARRAY
  async getTokenHolders(contractAddress, chainId = 'solana', limit = 100, cursor) {
    try {
      const chain = this.getChainId(chainId);
      const isSolana = this.isSolanaChain(chainId);

      let url;
      if (isSolana) {
        // Solana endpoint: /nft/{network}/{address}/owners
        // OR token endpoint if available
        url = new URL(`${this.baseUrl.replace('v2.2', 'v2')}/token/${chain}/${contractAddress}/owners`);
        url.searchParams.set('limit', String(limit));
        if (cursor) url.searchParams.set('cursor', cursor);
      } else {
        // EVM endpoint
        url = new URL(`${this.baseUrl}/erc20/${contractAddress}/owners`);
        url.searchParams.set('chain', chain);
        url.searchParams.set('limit', String(limit));
        url.searchParams.set('order', 'DESC');
        if (cursor) url.searchParams.set('cursor', cursor);
      }

      console.log(`Moralis: Getting token holders for ${contractAddress} on chain ${chain}`);
      console.log(`Moralis URL: ${url.toString()}`);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'X-API-Key': this.apiKey,
        },
      });

      const ct = response.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        const text = await response.text();
        throw new Error(
          `Moralis owners response was not JSON: ${response.status} ${text.slice(0, 120)}...`
        );
      }

      const data = await response.json();
      console.log('Moralis holders response:', JSON.stringify(data, null, 2));

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Endpoint returns { result: [...], cursor?, page?, page_size? }
      return Array.isArray(data.result) ? data.result : [];
    } catch (error) {
      console.error('Error getting Moralis token holders:', error);
      return null;
    }
  }

  // Get token holder stats/summary — OBJECT
  async getTokenHolderStats(contractAddress, chainId = 'solana') {
    try {
      const chain = this.getChainId(chainId);
      const isSolana = this.isSolanaChain(chainId);

      let url;
      if (isSolana) {
        // Solana: may need different endpoint or use holders count from owners
        // For now, try the token metadata endpoint which includes holder count
        url = new URL(`${this.baseUrl.replace('v2.2', 'v2')}/token/${chain}/${contractAddress}/metadata`);
      } else {
        // EVM: Stats are on /holders (no /stats suffix)
        url = new URL(`${this.baseUrl}/erc20/${contractAddress}/holders`);
        url.searchParams.set('chain', chain);
      }

      console.log(`Moralis: Getting token holder stats for ${contractAddress}`);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'X-API-Key': this.apiKey,
        },
      });

      const ct = response.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        const text = await response.text();
        throw new Error(
          `Moralis holder stats response was not JSON: ${response.status} ${text.slice(0, 120)}...`
        );
      }

      const data = await response.json();
      console.log('Moralis holder stats response:', data);

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      // This endpoint already returns the stats object directly
      return data;
    } catch (error) {
      console.error('Error getting Moralis token holder stats:', error);
      return null;
    }
  }

  // Get complete holder analysis - combines holders + stats
  async getCompleteHolderAnalysis(contractAddress, chainId = 'solana') {
    try {
      console.log(`Getting complete holder analysis from Moralis for ${contractAddress}...`);
      const isSolana = this.isSolanaChain(chainId);

      // Get holders and stats in parallel
      const [holdersData, statsData] = await Promise.all([
        this.getTokenHolders(contractAddress, chainId, 100),
        this.getTokenHolderStats(contractAddress, chainId),
      ]);

      console.log('Moralis results:', {
        holdersLength: holdersData?.length,
        statsData: statsData ? 'Available' : 'Not Available',
        chainType: isSolana ? 'Solana' : 'EVM',
      });

      if (!holdersData && !statsData) {
        return {
          error: 'No holder data available from Moralis',
          totalHolders: 0,
          devWallets: 0,
          topHolders: [],
          percentages: { top3Combined: 0, top10Combined: 0, top20Combined: 0 },
          dataQuality: 'Error',
        };
      }

      // Extract holder count from stats or estimate from holders list
      let holderCount;
      if (isSolana) {
        // For Solana, holder count might be in metadata or we use holders array length
        holderCount = statsData?.holders || statsData?.holderCount || holdersData?.length || 0;
      } else {
        holderCount = statsData?.totalHolders || holdersData?.length || 0;
      }

      // Process holder data - handle both Solana and EVM formats
      const topHolders = holdersData
        ? holdersData.map((holder) => {
            if (isSolana) {
              // Solana format
              return {
                address: holder.owner || holder.address,
                balance: holder.amount_formatted || holder.amount || holder.balance_formatted,
                balanceRaw: holder.amount || holder.balance,
                percentage: parseFloat(holder.percentage || holder.share || 0),
                usdValue: holder.usd_value || holder.value_usd || null,
                isContract: false, // Solana doesn't have contract distinction like EVM
              };
            } else {
              // EVM format
              return {
                address: holder.owner_address || holder.address,
                balance: holder.balance_formatted || holder.balance,
                balanceRaw: holder.balance,
                percentage: parseFloat(holder.percentage_relative_to_total_supply || 0),
                usdValue: holder.usd_value || null,
                isContract:
                  holder.is_contract === true ||
                  (holder.owner_address_label && holder.owner_address_label.includes('contract')) ||
                  false,
              };
            }
          })
        : [];

      // Calculate percentages from actual holder data
      const sumPct = (arr) => arr.reduce((sum, h) => sum + (isFinite(h.percentage) ? h.percentage : 0), 0);
      const top3Combined = sumPct(topHolders.slice(0, 3));
      const top10Combined = sumPct(topHolders.slice(0, 10));
      const top20Combined = sumPct(topHolders.slice(0, 20));

      // Estimate dev wallets
      let devWalletsEstimate;
      if (isSolana) {
        // For Solana, estimate based on large holders (no contract distinction)
        const largeHolders = topHolders.filter((h) => h.percentage > 1).length;
        devWalletsEstimate = Math.floor(largeHolders * 0.4); // More conservative for Solana
      } else {
        // For EVM, use contract holders + large holders
        const contractHolders = topHolders.filter((h) => h.isContract).length;
        const largeHolders = topHolders.filter((h) => h.percentage > 1).length;
        devWalletsEstimate = contractHolders + Math.floor(largeHolders * 0.6);
      }

      return {
        totalHolders: holderCount,
        devWallets: devWalletsEstimate,
        topHolders: topHolders.slice(0, 20), // Top 20 holders
        percentages: {
          top3Combined: Math.round(top3Combined * 100) / 100,
          top10Combined: Math.round(top10Combined * 100) / 100,
          top20Combined: Math.round(top20Combined * 100) / 100,
        },
        lastUpdated: new Date().toISOString(),
        dataQuality:
          holderCount > 0 && topHolders.length > 0
            ? 'High'
            : holderCount > 0
            ? 'Partial'
            : 'Limited',
        isEstimated: false, // Real data from Moralis
        dataSource: 'Moralis',
        chainType: isSolana ? 'Solana' : 'EVM',
        rawData: {
          stats: statsData,
          holdersCount: holdersData?.length || 0,
        },
      };
    } catch (error) {
      console.error('Error in Moralis holder analysis:', error);
      return {
        error: error.message,
        totalHolders: 0,
        devWallets: 0,
        topHolders: [],
        percentages: { top3Combined: 0, top10Combined: 0, top20Combined: 0 },
        dataQuality: 'Error',
      };
    }
  }

  // Test API connection
  async testConnection(chainId = 'solana') {
    try {
      const isSolana = this.isSolanaChain(chainId);
      
      let testUrl;
      if (isSolana) {
        // Test with a known Solana token (BONK)
        const chain = this.getChainId(chainId);
        testUrl = `${this.baseUrl.replace('v2.2', 'v2')}/token/${chain}/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263/owners?limit=5`;
      } else {
        // Test with a known BSC token (CAKE)
        testUrl = `${this.baseUrl}/erc20/0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82/owners?chain=0x38&limit=5&order=DESC`;
      }

      console.log('Testing Moralis connection...');
      console.log('Test URL:', testUrl);
      console.log('Chain type:', isSolana ? 'Solana' : 'EVM');

      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'X-API-Key': this.apiKey,
        },
      });

      const ct = response.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        const text = await response.text();
        throw new Error(
          `Moralis test response was not JSON: ${response.status} ${text.slice(0, 120)}...`
        );
      }

      const data = await response.json();
      console.log('Moralis connection test result:', {
        status: response.status,
        ok: response.ok,
        dataReceived: !!data.result,
        resultLength: data.result?.length || 0,
        chainType: isSolana ? 'Solana' : 'EVM',
      });

      return response.ok && Array.isArray(data.result) && data.result.length > 0;
    } catch (error) {
      console.error('Moralis connection test failed:', error);
      return false;
    }
  }

  // Get token metadata
  async getTokenMetadata(contractAddress, chainId = 'solana') {
    try {
      const chain = this.getChainId(chainId);
      const isSolana = this.isSolanaChain(chainId);

      let url;
      if (isSolana) {
        // Solana token metadata endpoint
        url = `${this.baseUrl.replace('v2.2', 'v2')}/token/${chain}/${contractAddress}/metadata`;
      } else {
        // EVM token metadata endpoint
        url = `${this.baseUrl}/erc20/${contractAddress}?chain=${chain}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'X-API-Key': this.apiKey,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error('Error getting token metadata from Moralis:', error);
      return null;
    }
  }

  // Get Solana token price (specific to Solana)
  async getSolanaTokenPrice(contractAddress) {
    try {
      const chain = this.getChainId('solana');
      const url = `${this.baseUrl.replace('v2.2', 'v2')}/token/${chain}/${contractAddress}/price`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'X-API-Key': this.apiKey,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error('Error getting Solana token price from Moralis:', error);
      return null;
    }
  }

  // Get Solana NFT metadata (if token is an NFT)
  async getSolanaNFTMetadata(contractAddress) {
    try {
      const chain = this.getChainId('solana');
      const url = `${this.baseUrl.replace('v2.2', 'v2')}/nft/${chain}/${contractAddress}/metadata`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'X-API-Key': this.apiKey,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error('Error getting Solana NFT metadata from Moralis:', error);
      return null;
    }
  }
}

export default MoralisService;