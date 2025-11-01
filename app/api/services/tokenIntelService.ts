// app/api/services/tokenIntelService.js
// @ts-nocheck

import { DexScreenerService } from './dexScreenerService';
import { PumpFunService } from './pumpFunService';

export class TokenIntelligenceService {
  constructor() {
    this.dexScreener = new DexScreenerService();
    this.pumpFun = new PumpFunService(process.env.HELIUS_API_KEY); // Or appropriate API key
  }

  async getCompleteTokenIntel(tokenAddress, chainId = 'solana') {
    try {
      // Validate address format (Solana base58)
      if (!this.isValidAddress(tokenAddress)) {
        throw new Error('Invalid token address format');
      }

      console.log(`🔍 Analyzing Solana token: ${tokenAddress}`);

      // First, check if it's a Pump.fun token
      let pumpFunData = null;
      let isPumpFunToken = false;
      
      try {
        console.log('Checking Pump.fun...');
        pumpFunData = await this.pumpFun.getTokenData(tokenAddress);
        isPumpFunToken = pumpFunData !== null;
        
        if (isPumpFunToken) {
          console.log('✅ Pump.fun token detected');
        }
      } catch (error) {
        console.log('⚠️ Pump.fun check failed:', error.message);
      }

      // If it's a pre-graduation Pump.fun token, use only Pump.fun data
      if (isPumpFunToken && !pumpFunData.isGraduated) {
        console.log('📊 Pre-graduation Pump.fun token, using Pump.fun data only');
        return this.formatIntelResponse({
          primary: pumpFunData,
          secondary: null,
          tokenType: 'pumpfun-pregraduation',
          tokenAddress,
          isPumpFunToken: true,
          isGraduated: false
        });
      }

      // Either not a Pump.fun token, or it's graduated - use DEXScreener
      console.log('🔍 Fetching from DEXScreener...');
      const dexScreenerData = await this.dexScreener.getTokenData(tokenAddress, chainId);
      
      if (!dexScreenerData) {
        console.log('❌ Token not found on DEXScreener');
        return this.formatNotFoundResponse(tokenAddress);
      }

      console.log('✅ DEXScreener data received');

      return this.formatIntelResponse({
        primary: dexScreenerData,
        secondary: pumpFunData,
        tokenType: isPumpFunToken ? 'pumpfun-graduated' : 'regular',
        tokenAddress,
        isPumpFunToken,
        isGraduated: true
      });
    } catch (error) {
      console.error('❌ Token intelligence error:', error);
      throw error;
    }
  }

  formatIntelResponse({ primary, secondary, tokenType, tokenAddress, isPumpFunToken, isGraduated }) {
    // Calculate token age
    const tokenAge = this.calculateTokenAge(primary, secondary);
    
    // Calculate market cap
    const marketCap = this.calculateMarketCap(primary, secondary);
    
    // Format social links
    const socialLinks = this.formatSocialLinks(primary, secondary);
    
    // Calculate holder metrics
    const holderMetrics = this.calculateHolderMetrics(primary, secondary);

    return {
      // Token Identity
      tokenName: primary?.tokenName || secondary?.tokenName || 'Unknown Token',
      symbol: primary?.tokenSymbol || secondary?.tokenSymbol || 'UNKNOWN',
      contract: tokenAddress,
      chain: 'Solana',
      
      // Token Type & Status
      tokenType,
      isPumpFunToken,
      migrationStatus: isPumpFunToken ? (isGraduated ? 'Graduated' : 'Pre-graduation') : 'N/A',
      bondingCurveProgress: primary?.bondingCurveProgress || secondary?.bondingCurveProgress || null,
      
      // Market Data
      marketCap,
      liquidity: primary?.liquidity || secondary?.liquidity || null,
      volume24h: primary?.volume24h || secondary?.volume24h || null,
      price: primary?.price || secondary?.price || null,
      priceChange24h: primary?.priceChange24h || null,
      
      // Trading Activity
      trades24h: primary?.trades24h || secondary?.trades24h || null,
      txns24h: (primary?.txns24h?.buys || 0) + (primary?.txns24h?.sells || 0) || null,
      buyers24h: primary?.buyers24h || secondary?.buyers24h || null,
      sellers24h: primary?.sellers24h || secondary?.sellers24h || null,
      
      // Token Info
      tokenAge,
      pairCreatedAt: primary?.pairCreatedAt || null,
      createdAt: primary?.createdAt || secondary?.createdAt || null,
      
      // Social & Links
      social: socialLinks,
      
      // Holder Analysis
      holders: holderMetrics,
      
      // Risk Assessment (placeholder - requires additional APIs)
      riskAssessment: {
        safetyScore: null,
        bundlers: null,
        honeypot: null,
        rugRisk: null,
        taxes: null
      },
      
      // Data Sources
      dataSources: {
        primary: primary?.dataSource || (tokenType.includes('pumpfun') && !isGraduated ? 'pumpfun' : 'dexscreener'),
        secondary: secondary?.dataSource || null,
        available: [
          primary?.dataSource || (tokenType.includes('pumpfun') && !isGraduated ? 'pumpfun' : 'dexscreener'),
          secondary?.dataSource
        ].filter(Boolean)
      },
      
      // Raw data for debugging
      _debug: {
        pumpFunData: tokenType.includes('pumpfun') ? secondary || primary : null,
        dexScreenerData: !tokenType.includes('pumpfun') || isGraduated ? primary : null
      }
    };
  }

  calculateTokenAge(primary, secondary) {
    const pairCreated = primary?.pairCreatedAt || secondary?.createdAt;
    
    if (pairCreated) {
      const created = new Date(pairCreated);
      const now = new Date();
      const diffMs = now - created;
      return Math.floor(diffMs / (1000 * 60)); // Return minutes
    }
    
    return null;
  }

  calculateMarketCap(primary, secondary) {
    return primary?.marketCap || primary?.fdv || secondary?.marketCap || null;
  }

  formatSocialLinks(primary, secondary) {
    const social = primary?.info?.socials || [];
    const websites = primary?.info?.websites || [];
    
    const links = {};
    
    // Extract social links from DEXScreener
    social.forEach(item => {
      if (item.platform === 'twitter' || item.platform === 'x') {
        links.x = `https://x.com/${item.handle}`;
      } else if (item.platform === 'telegram') {
        links.tg = `https://t.me/${item.handle}`;
      }
    });
    
    // Extract website
    if (websites.length > 0) {
      links.website = websites[0].url;
    }

    // Add Pump.fun social data if available
    if (secondary?.twitter) links.x = secondary.twitter;
    if (secondary?.telegram) links.tg = secondary.telegram;
    if (secondary?.website) links.website = secondary.website;
    
    return Object.keys(links).length > 0 ? links : null;
  }

  calculateHolderMetrics(primary, secondary) {
    const topTraders = primary?.topTraders || secondary?.topTraders || [];
    const totalTraders = primary?.totalTraders || secondary?.totalTraders || 0;
    
    if (topTraders.length === 0) {
      return {
        total: totalTraders,
        top3: [],
        top10Pct: null,
        devTokens: null,
        devSold: null
      };
    }
    
    // Calculate percentages (rough estimate based on trading volume)
    const totalVolume = topTraders.reduce((sum, trader) => sum + trader.volume, 0);
    const top3Percentages = topTraders.slice(0, 3).map(trader => {
      if (totalVolume === 0) return 0;
      return parseFloat(((trader.volume / totalVolume) * 100).toFixed(1));
    });
    
    const top10Volume = topTraders.slice(0, 10).reduce((sum, trader) => sum + trader.volume, 0);
    const top10Percentage = totalVolume > 0 ? parseFloat(((top10Volume / totalVolume) * 100).toFixed(0)) : 0;
    
    return {
      total: totalTraders,
      top3: top3Percentages,
      top10Pct: top10Percentage,
      devTokens: topTraders.length,
      devSold: false
    };
  }

  formatNotFoundResponse(tokenAddress) {
    return {
      tokenName: 'Unknown Token',
      symbol: 'UNKNOWN',
      contract: tokenAddress,
      chain: 'Solana',
      tokenType: 'unknown',
      error: 'Token not found on supported platforms',
      dataSources: {
        primary: null,
        secondary: null,
        available: []
      }
    };
  }

  isValidAddress(address) {
    // Solana addresses are base58 encoded, typically 32-44 characters
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  }
}