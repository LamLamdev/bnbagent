// services/bscScanService.js - REPLACE WITH THIS FALLBACK VERSION

class BSCScanService {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.ETHERSCAN_API_KEY;
    this.baseUrl = 'https://api.etherscan.io/v2/api';
    this.chainId = 56; // BSC Mainnet
    
    if (!this.apiKey) {
      console.error('No Etherscan API key provided');
      throw new Error('Etherscan API key is required');
    }
  }

  // Try the Pro endpoint first, fallback to free alternatives
  async getHolderCount(contractAddress) {
    try {
      // Try Pro endpoint first
      const url = `${this.baseUrl}?chainid=${this.chainId}&module=token&action=tokenholdercount&contractaddress=${contractAddress}&apikey=${this.apiKey}`;
      
      console.log('Trying BSCScan holder count (Pro):', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('BSCScan holder count response:', data);
      
      if (data.status === '1' && data.result) {
        return parseInt(data.result);
      }
      
      // If Pro endpoint fails, try alternative method
      if (data.message === 'NOTOK' || data.result === 'Error! Missing/Invalid API Key') {
        console.warn('Pro endpoint not available, using fallback method');
        return null; // Will be estimated from top holders
      }
      
      throw new Error(data.message || data.result || 'Failed to get holder count');
    } catch (error) {
      console.error('Error getting holder count:', error.message);
      return null;
    }
  }

  // Try multiple endpoints for holder data
  async getTopHolders(contractAddress, page = 1, offset = 100) {
    try {
      // Try the topholders endpoint first (free tier, but limited chains)
      let url = `${this.baseUrl}?chainid=${this.chainId}&module=token&action=topholders&contractaddress=${contractAddress}&offset=${Math.min(offset, 1000)}&apikey=${this.apiKey}`;
      
      console.log('Trying topholders endpoint:', url);
      
      let response = await fetch(url);
      let data = await response.json();
      
      console.log('BSCScan topholders response:', data);
      
      if (data.status === '1' && data.result && Array.isArray(data.result)) {
        return data.result.map(holder => ({
          address: holder.TokenHolderAddress,
          balance: holder.TokenHolderQuantity,
          balanceFormatted: this.formatTokenBalance(holder.TokenHolderQuantity)
        }));
      }
      
      // Fallback to tokenholderlist (Pro endpoint)
      console.log('Trying tokenholderlist endpoint...');
      url = `${this.baseUrl}?chainid=${this.chainId}&module=token&action=tokenholderlist&contractaddress=${contractAddress}&page=${page}&offset=${offset}&apikey=${this.apiKey}`;
      
      response = await fetch(url);
      data = await response.json();
      
      console.log('BSCScan tokenholderlist response:', data);
      
      if (data.status === '1' && data.result && Array.isArray(data.result)) {
        return data.result.map(holder => ({
          address: holder.TokenHolderAddress,
          balance: holder.TokenHolderQuantity,
          balanceFormatted: this.formatTokenBalance(holder.TokenHolderQuantity)
        }));
      }
      
      // If both fail, try to get some holder info from token transfers
      console.log('Both holder endpoints failed, trying transfer analysis...');
      return await this.getHoldersFromTransfers(contractAddress);
      
    } catch (error) {
      console.error('Error getting top holders:', error.message);
      return [];
    }
  }

  // Fallback method: analyze recent transfers to estimate holders
  async getHoldersFromTransfers(contractAddress) {
    try {
      const url = `${this.baseUrl}?chainid=${this.chainId}&module=account&action=tokentx&contractaddress=${contractAddress}&page=1&offset=100&sort=desc&apikey=${this.apiKey}`;
      
      console.log('Analyzing transfers for holder data:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === '1' && data.result && Array.isArray(data.result)) {
        // Extract unique addresses from recent transfers
        const uniqueAddresses = new Set();
        data.result.forEach(tx => {
          if (tx.to !== '0x0000000000000000000000000000000000000000') {
            uniqueAddresses.add(tx.to);
          }
          if (tx.from !== '0x0000000000000000000000000000000000000000') {
            uniqueAddresses.add(tx.from);
          }
        });
        
        console.log(`Found ${uniqueAddresses.size} unique addresses from recent transfers`);
        
        // This is a very rough estimate - return partial data
        return Array.from(uniqueAddresses).slice(0, 10).map((address, index) => ({
          address: address,
          balance: '0', // Can't determine balance without individual queries
          balanceFormatted: 'Unknown',
          estimated: true
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error analyzing transfers:', error);
      return [];
    }
  }

  async getTokenTotalSupply(contractAddress) {
    try {
      const url = `${this.baseUrl}?chainid=${this.chainId}&module=stats&action=tokensupply&contractaddress=${contractAddress}&apikey=${this.apiKey}`;
      
      console.log('BSCScan total supply URL:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('BSCScan total supply response:', data);
      
      if (data.status === '1' && data.result) {
        return data.result;
      }
      
      throw new Error(data.message || data.result || 'Failed to get total supply');
    } catch (error) {
      console.error('Error getting total supply:', error.message);
      return null;
    }
  }

  async getCompleteHolderAnalysis(contractAddress) {
    try {
      console.log(`Getting holder analysis for ${contractAddress} using multi-endpoint strategy...`);
      
      // Get all available data
      const [holderCount, topHolders, totalSupply] = await Promise.all([
        this.getHolderCount(contractAddress),
        this.getTopHolders(contractAddress, 1, 50),
        this.getTokenTotalSupply(contractAddress)
      ]);

      console.log('BSCScan results:', { 
        holderCount, 
        topHoldersLength: topHolders?.length, 
        totalSupply: totalSupply ? 'Available' : 'Not Available',
        hasEstimatedData: topHolders?.some(h => h.estimated)
      });

      // Work with whatever data we have
      const validTopHolders = topHolders || [];
      const validTotalSupply = totalSupply || '1000000000000000000000000'; // Default 1M tokens
      
      // Estimate holder count if not available
      let estimatedHolderCount = holderCount;
      if (!holderCount && validTopHolders.length > 0) {
        // Very rough estimate based on transfer activity
        estimatedHolderCount = validTopHolders.length * 10; // Estimate 10x more holders than we can see
        console.log(`Estimated holder count: ${estimatedHolderCount} (based on ${validTopHolders.length} known holders)`);
      }
      
      // Calculate percentages if we have real balance data
      let percentages = { top3Combined: 0, top10Combined: 0, top20Combined: 0 };
      
      const nonEstimatedHolders = validTopHolders.filter(h => !h.estimated && h.balance !== '0');
      
      if (nonEstimatedHolders.length > 0 && totalSupply) {
        percentages.top3Combined = this.calculateTopNPercentage(nonEstimatedHolders.slice(0, 3), validTotalSupply);
        percentages.top10Combined = this.calculateTopNPercentage(nonEstimatedHolders.slice(0, 10), validTotalSupply);
        percentages.top20Combined = this.calculateTopNPercentage(nonEstimatedHolders.slice(0, 20), validTotalSupply);
      }

      // Identify potential dev wallets
      const devWallets = nonEstimatedHolders.filter((holder, index) => {
        if (!totalSupply || holder.balance === '0') return false;
        const percentage = (parseFloat(holder.balance) / parseFloat(totalSupply)) * 100;
        return index < 5 || percentage > 1;
      }).length;

      // Determine data quality
      const dataQuality = holderCount && nonEstimatedHolders.length > 0 ? 'High' : 
                         validTopHolders.length > 0 ? 'Partial' : 'Limited';

      return {
        totalHolders: estimatedHolderCount || 0,
        devWallets: devWallets,
        topHolders: validTopHolders.slice(0, 10),
        percentages: {
          top3Combined: Math.round(percentages.top3Combined * 100) / 100,
          top10Combined: Math.round(percentages.top10Combined * 100) / 100,
          top20Combined: Math.round(percentages.top20Combined * 100) / 100
        },
        totalSupply: totalSupply,
        lastUpdated: new Date().toISOString(),
        dataQuality: dataQuality,
        isEstimated: !holderCount || validTopHolders.some(h => h.estimated),
        apiLimitation: !holderCount ? 'Holder count requires API Pro subscription' : null
      };

    } catch (error) {
      console.error('Error in complete holder analysis:', error);
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

  calculateTopNPercentage(holders, totalSupply) {
    if (!holders || holders.length === 0 || !totalSupply) return 0;
    
    const totalHolding = holders.reduce((sum, holder) => {
      return sum + parseFloat(holder.balance || '0');
    }, 0);
    
    return (totalHolding / parseFloat(totalSupply)) * 100;
  }

  formatTokenBalance(balance) {
    const num = parseFloat(balance || '0');
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
  }

  // Test which endpoints are available with current API key
  async testAvailableEndpoints(contractAddress = '0x0ACE816a5336D8Bdf8DEce69cf084A03e36c4444') {
    console.log('Testing available endpoints...');
    
    const endpoints = [
      { name: 'tokenholdercount', url: `${this.baseUrl}?chainid=${this.chainId}&module=token&action=tokenholdercount&contractaddress=${contractAddress}&apikey=${this.apiKey}` },
      { name: 'tokenholderlist', url: `${this.baseUrl}?chainid=${this.chainId}&module=token&action=tokenholderlist&contractaddress=${contractAddress}&page=1&offset=10&apikey=${this.apiKey}` },
      { name: 'topholders', url: `${this.baseUrl}?chainid=${this.chainId}&module=token&action=topholders&contractaddress=${contractAddress}&offset=10&apikey=${this.apiKey}` },
      { name: 'tokensupply', url: `${this.baseUrl}?chainid=${this.chainId}&module=stats&action=tokensupply&contractaddress=${contractAddress}&apikey=${this.apiKey}` }
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint.url);
        const data = await response.json();
        console.log(`${endpoint.name}: ${data.status === '1' ? '✅ Available' : `❌ ${data.message || data.result}`}`);
      } catch (error) {
        console.log(`${endpoint.name}: ❌ Error - ${error.message}`);
      }
    }
  }
}

export default BSCScanService;