// services/heliusService.js

class HeliusService {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.HELIUS_API_KEY;
    this.baseUrl = 'https://api-mainnet.helius-rpc.com';
    this.rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${this.apiKey}`;

    if (!this.apiKey) {
      console.error('⚠️ No Helius API key provided');
      throw new Error('Helius API key is required');
    }

    console.log('✅ Helius service initialized');
  }

  // Get token holders using Helius DAS API
  async getTokenHolders(tokenAddress, limit = 100) {
    try {
      console.log(`📡 Helius: Fetching holders for ${tokenAddress}`);

      const url = `${this.baseUrl}/v0/addresses/${tokenAddress}/balances?api-key=${this.apiKey}`;
      
      console.log(`   URL: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      console.log(`   Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Helius error (${response.status}):`, errorText);
        return null;
      }

      const data = await response.json();
      console.log(`✅ Helius: Received ${data.result?.length || 0} holders`);

      return data;
    } catch (error) {
      console.error('❌ Error getting Helius token holders:', error);
      return null;
    }
  }

  // Get token metadata using Helius DAS API
  async getTokenMetadata(tokenAddress) {
    try {
      console.log(`📡 Helius: Fetching metadata for ${tokenAddress}`);

      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'helius-metadata',
          method: 'getAsset',
          params: {
            id: tokenAddress,
            displayOptions: {
              showFungible: true
            }
          },
        }),
      });

      if (!response.ok) {
        console.error(`❌ Helius metadata error: ${response.status}`);
        return null;
      }

      const data = await response.json();
      console.log(`✅ Helius: Metadata received`);

      return data.result;
    } catch (error) {
      console.error('❌ Error getting Helius metadata:', error);
      return null;
    }
  }

  // Get token supply using RPC
  async getTokenSupply(tokenAddress) {
    try {
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'get-supply',
          method: 'getTokenSupply',
          params: [tokenAddress],
        }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      return data.result?.value;
    } catch (error) {
      console.error('❌ Error getting token supply:', error);
      return null;
    }
  }

  // Get token accounts (holders) using RPC
  async getTokenLargestAccounts(tokenAddress, limit = 20) {
    try {
      console.log(`📡 Helius: Fetching largest accounts for ${tokenAddress}`);

      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'get-largest-accounts',
          method: 'getTokenLargestAccounts',
          params: [
            tokenAddress,
            {
              commitment: 'finalized'
            }
          ],
        }),
      });

      console.log(`   Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Helius largest accounts error (${response.status}):`, errorText);
        return null;
      }

      const data = await response.json();
      
      if (data.error) {
        console.error('❌ Helius RPC error:', data.error);
        return null;
      }

      console.log(`✅ Helius: Received ${data.result?.value?.length || 0} largest accounts`);

      return data.result?.value || [];
    } catch (error) {
      console.error('❌ Error getting largest accounts:', error);
      return null;
    }
  }

  // Get complete holder analysis
  async getCompleteHolderAnalysis(tokenAddress) {
    try {
      console.log(`\n🔍 Helius: Starting holder analysis for ${tokenAddress}`);

      // Get token supply and largest accounts in parallel
      const [supplyData, largestAccounts] = await Promise.all([
        this.getTokenSupply(tokenAddress),
        this.getTokenLargestAccounts(tokenAddress, 20),
      ]);

      console.log('📊 Helius results:');
      console.log(`   Supply: ${supplyData ? '✅' : '❌'}`);
      console.log(`   Largest accounts: ${largestAccounts?.length || 0}`);

      if (!supplyData || !largestAccounts || largestAccounts.length === 0) {
        console.warn('⚠️ Insufficient holder data from Helius');
        return {
          error: 'Insufficient holder data from Helius',
          totalHolders: 0,
          devWallets: 0,
          topHolders: [],
          percentages: { top3Combined: 0, top10Combined: 0, top20Combined: 0 },
          dataQuality: 'Limited',
          dataSource: 'Helius',
        };
      }

      // Parse supply
      const totalSupply = parseFloat(supplyData.amount);
      const decimals = supplyData.decimals;

      // Process largest accounts
      const topHolders = largestAccounts.map((account, index) => {
        const balance = parseFloat(account.amount);
        const percentage = (balance / totalSupply) * 100;

        return {
          address: account.address,
          balance: (balance / Math.pow(10, decimals)).toFixed(2),
          balanceRaw: account.amount,
          percentage: parseFloat(percentage.toFixed(2)),
          usdValue: null, // Would need price data to calculate
          isContract: false, // Solana doesn't have same contract concept
        };
      });

      // Calculate combined percentages
      const sumPct = (arr) => arr.reduce((sum, h) => sum + (h.percentage || 0), 0);
      const top3Combined = sumPct(topHolders.slice(0, 3));
      const top10Combined = sumPct(topHolders.slice(0, 10));
      const top20Combined = sumPct(topHolders.slice(0, 20));

      // Estimate dev wallets (holders with >1% of supply)
      const largeHolders = topHolders.filter((h) => h.percentage > 1).length;
      const devWalletsEstimate = Math.floor(largeHolders * 0.5);

      // Estimate total holder count (rough heuristic)
      // If top holder has X%, estimate total holders
      const topHolderPct = topHolders[0]?.percentage || 0;
      let estimatedTotalHolders;
      if (topHolderPct > 50) {
        estimatedTotalHolders = Math.floor(100 / topHolderPct) * 10;
      } else if (topHolderPct > 20) {
        estimatedTotalHolders = Math.floor(100 / topHolderPct) * 50;
      } else {
        estimatedTotalHolders = Math.floor(100 / topHolderPct) * 100;
      }

      const result = {
        totalHolders: estimatedTotalHolders,
        devWallets: devWalletsEstimate,
        topHolders: topHolders,
        percentages: {
          top3Combined: Math.round(top3Combined * 100) / 100,
          top10Combined: Math.round(top10Combined * 100) / 100,
          top20Combined: Math.round(top20Combined * 100) / 100,
        },
        lastUpdated: new Date().toISOString(),
        dataQuality: 'High',
        isEstimated: true, // Total holder count is estimated
        dataSource: 'Helius',
        chainType: 'Solana',
        rawData: {
          supply: supplyData,
          accountsCount: largestAccounts.length,
        },
      };

      console.log('✅ Helius analysis complete:');
      console.log(`   Estimated holders: ${result.totalHolders}`);
      console.log(`   Top holders: ${result.topHolders.length}`);
      console.log(`   Top 10 combined: ${result.percentages.top10Combined}%`);

      return result;
    } catch (error) {
      console.error('❌ Error in Helius holder analysis:', error);
      return {
        error: error.message,
        totalHolders: 0,
        devWallets: 0,
        topHolders: [],
        percentages: { top3Combined: 0, top10Combined: 0, top20Combined: 0 },
        dataQuality: 'Error',
        dataSource: 'Helius',
      };
    }
  }

  // Test connection
  async testConnection() {
    try {
      console.log('\n🧪 Testing Helius API connection...');

      // Test with BONK token
      const testToken = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
      
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'test',
          method: 'getTokenSupply',
          params: [testToken],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.result) {
          console.log('✅ Helius API connection successful!');
          return true;
        }
      }

      console.error('❌ Helius API connection failed');
      return false;
    } catch (error) {
      console.error('❌ Helius connection test error:', error);
      return false;
    }
  }
}

export default HeliusService;