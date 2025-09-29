// app/api/services/tokenIntelService.js
// @ts-nocheck

import { DexScreenerService } from './dexScreenerService';
import { FourMemeService } from './fourMemeService';

export class TokenIntelligenceService {
  constructor() {
    this.dexScreener = new DexScreenerService();
    this.fourMeme = new FourMemeService(process.env.BITQUERY_API_KEY);
  }

  async getCompleteTokenIntel(tokenAddress, chainId = 'bsc') {
  try {
    // Validate address format
    if (!this.isValidAddress(tokenAddress)) {
      throw new Error('Invalid token address format');
    }

    // First, check if it's a Four Meme token and get bonding curve status
    let fourMemeData = null;
    let isFourMemeToken = false;
    
   try {
  // fourMemeData = await this.fourMeme.getTokenData(tokenAddress);
  fourMemeData = null; // Disable until we get proper Bitquery access
  isFourMemeToken = false;
} catch (error) {
      console.log('Four Meme API failed, treating as regular token:', error.message);
    }

    if (isFourMemeToken) {
      // Check for suspicious data - high progress but low liquidity indicates bad data
      const suspiciousData = fourMemeData.bondingCurveProgress >= 95 && 
                           fourMemeData.liquidity && 
                           fourMemeData.liquidity < 100000; // Less than $100k liquidity

      if (suspiciousData) {
        console.log('Detected suspicious Four Meme data, treating as prebond');
        fourMemeData.bondingCurveProgress = 0; // Override bad progress data
        fourMemeData.isCompleted = false;
      }

      if (fourMemeData.bondingCurveProgress < 100) {
        // Pre-bond Four Meme token - use only Four Meme data
        console.log('Pre-bond Four Meme token detected, using Four Meme API only');
        return this.formatIntelResponse({
          primary: fourMemeData,
          secondary: null,
          tokenType: 'fourmeme-prebond',
          tokenAddress,
          isFourMemeToken: true,
          isMigrated: false
        });
      }
    }

    // Either not a Four Meme token, or it's migrated - use DEXScreener
    console.log('Using DEXScreener for bonded/regular token');
    const dexScreenerData = await this.dexScreener.getTokenData(tokenAddress, chainId);
    
    if (!dexScreenerData) {
      return this.formatNotFoundResponse(tokenAddress);
    }

    return this.formatIntelResponse({
      primary: dexScreenerData,
      secondary: fourMemeData,
      tokenType: isFourMemeToken ? 'fourmeme-postbond' : 'regular',
      tokenAddress,
      isFourMemeToken,
      isMigrated: true
    });
  } catch (error) {
    console.error('Token intelligence error:', error);
    throw error;
  }
}
  formatIntelResponse({ primary, secondary, tokenType, tokenAddress, isFourMemeToken, isMigrated }) {
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
      chain: 'BNB',
      
      // Token Type & Status
      tokenType,
      isFourMemeToken,
      migrationStatus: isFourMemeToken ? (isMigrated ? 'Completed' : 'Pre-migration') : 'N/A',
      bondingCurveProgress: primary?.bondingCurveProgress || secondary?.bondingCurveProgress || null,
      
      // Market Data
      marketCap,
      liquidity: primary?.liquidity || secondary?.liquidity || null,
      volume24h: primary?.volume24h || secondary?.volume24h || null,
      price: primary?.price || secondary?.price || null,
      priceChange24h: primary?.priceChange24h || null,
      
      // Trading Activity
      trades24h: primary?.trades24h || secondary?.trades24h || null,
      txns24h: primary?.txns24h?.buys + primary?.txns24h?.sells || null,
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
        primary: primary?.dataSource || (tokenType.includes('fourmeme') && !isMigrated ? 'fourmeme' : 'dexscreener'),
        secondary: secondary?.dataSource || null,
        available: [
          primary?.dataSource || (tokenType.includes('fourmeme') && !isMigrated ? 'fourmeme' : 'dexscreener'),
          secondary?.dataSource
        ].filter(Boolean)
      },
      
      // Raw data for debugging
      _debug: {
        fourMemeData: tokenType.includes('fourmeme') ? primary || secondary : null,
        dexScreenerData: !tokenType.includes('fourmeme') || isMigrated ? primary : null
      }
    };
  }

 calculateTokenAge(primary, secondary) {
  const pairCreated = primary?.pairCreatedAt;
  
  if (pairCreated) {
    // pairCreatedAt is already a Unix timestamp in milliseconds from DEXScreener
    const created = new Date(pairCreated);
    const now = new Date();
    const diffMs = now - created;
    return Math.floor(diffMs / (1000 * 60)); // Return minutes
  }
  
  return null;
}

  calculateMarketCap(primary, secondary) {
    // Use primary source first, fallback to secondary
    return primary?.marketCap || primary?.fdv || secondary?.marketCap || null;
  }

  formatSocialLinks(primary, secondary) {
    const social = primary?.info?.socials || [];
    const websites = primary?.info?.websites || [];
    
    const links = {};
    
    // Extract social links
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
      devSold: false // Cannot determine from available data
    };
  }

  formatNotFoundResponse(tokenAddress) {
    return {
      tokenName: 'Unknown Token',
      symbol: 'UNKNOWN',
      contract: tokenAddress,
      chain: 'BNB',
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
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
}