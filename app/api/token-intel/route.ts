// app/api/token-intel/route.ts
// @ts-nocheck

import { TokenIntelligenceService } from '../services/tokenIntelService.ts';
import MoralisService from '../services/moralisService.js';

// simple prebond detector: no liq + no mc + (no price OR no activity)
function isLikelyPrebond(intel: any) {
  const zeroish = (v: any) => v === 0 || v === null || v === undefined;
  return (
    zeroish(intel?.liquidity) &&
    zeroish(intel?.marketCap) &&
    (zeroish(intel?.price) || zeroish(intel?.txns24h))
  );
}

// Initialize Moralis service with environment variable
const moralis = new MoralisService();

export async function POST(request) {
  try {
    const body = await request.json();
    const { tokenAddress, chainId = 'bsc' } = body;

    // Validate input
    if (!tokenAddress) {
      return Response.json(
        { error: 'Token address is required' },
        { status: 400 }
      );
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) {
      return Response.json(
        { error: 'Invalid token address format' },
        { status: 400 }
      );
    }

    // Initialize service
    const tokenIntel = new TokenIntelligenceService();

    // Get token intelligence data and holder analysis in parallel
    console.log(`Analyzing token ${tokenAddress} with Moralis holder data...`);
    
    const [intelData, holderAnalysis] = await Promise.all([
      tokenIntel.getCompleteTokenIntel(tokenAddress, chainId),
      moralis.getCompleteHolderAnalysis(tokenAddress, chainId)
    ]);

    // Add logging here:
    console.log('Raw intel data before transform:', intelData);
    console.log('Moralis holder analysis data:', holderAnalysis);

    if (isLikelyPrebond(intelData)) {
  return Response.json({
    success: true,
    data: {
      isPrebond: true,
      prebondReason: 'No liquidity/market data (likely pre-bonded).',
      tokenName: intelData?.tokenName || 'Unknown Token',
      symbol: intelData?.symbol || 'UNKNOWN',
      contract: tokenAddress,
      chain: 'BNB',
      analyzedAt: new Date().toISOString(),
    },
  });
}
    
    // Transform data to match frontend format (now with real holder data from Moralis)
    const formattedData = transformToFrontendFormat(intelData, holderAnalysis);
    
    console.log('Formatted data after transform:', formattedData);

    return Response.json({
      success: true,
      data: formattedData
    });

  } catch (error) {
    console.error('Token Intel API Error:', error);

    // Handle specific error types
    if (error.message.includes('Invalid token address')) {
      return Response.json(
        { error: 'Invalid token address format' },
        { status: 400 }
      );
    }

    if (error.message.includes('Token not found')) {
      return Response.json(
        { error: 'Token not found on supported platforms' },
        { status: 404 }
      );
    }

    if (error.message.includes('API error')) {
      return Response.json(
        { error: 'External API service unavailable' },
        { status: 503 }
      );
    }

    // Generic error
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const tokenAddress = searchParams.get('address');
  const chainId = searchParams.get('chain') || 'bsc';

  if (!tokenAddress) {
    return Response.json(
      { error: 'Token address parameter is required' },
      { status: 400 }
    );
  }

  // Reuse POST logic
  return POST({
    json: async () => ({ tokenAddress, chainId })
  });
}

/**
 * Transform API response to match frontend mock data format
 * Now includes Moralis real holder analysis data
 */
function transformToFrontendFormat(intelData, holderAnalysis) {
  // Handle case where token wasn't found
  if (intelData.error) {
    return {
      error: intelData.error,
      tokenName: 'Unknown Token',
      symbol: 'UNKNOWN',
      contract: intelData.contract,
      chain: 'BNB'
    };
  }

  // Handle Moralis holder data
  const hasRealHolderData = holderAnalysis && !holderAnalysis.error && holderAnalysis.totalHolders > 0;
  const holderDataQuality = holderAnalysis?.dataQuality || 'Limited';
  
  // Calculate holder-based risk assessment
  const holderRiskScore = hasRealHolderData ? calculateHolderRiskScore(holderAnalysis) : null;
  const basicSafetyScore = calculateBasicSafetyScore(intelData, holderAnalysis);

  return {
    // Basic Token Info
    tokenName: intelData.tokenName,
    symbol: intelData.symbol,
    contract: intelData.contract,
    chain: intelData.chain,

    // Safety & Risk Assessment (enhanced with Moralis data)
    safetyScore: basicSafetyScore,
    bundlersPct: hasRealHolderData ? calculateBundlersFromHolders(holderAnalysis) : 
                 intelData.riskAssessment?.bundlers || null,
    honeypot: intelData.riskAssessment?.honeypot || false,
    rugRatioPct: holderRiskScore, // Use holder concentration as rug risk indicator

    // Market Data
    mcUSD: intelData.marketCap || null,
    liquidityUSD: intelData.liquidity || null,
    volume24hUSD: intelData.volume24h || null,
    
    // Trading taxes (placeholder - requires contract analysis)
    buyTaxPct: intelData.taxes?.buy || null,
    sellTaxPct: intelData.taxes?.sell || null,
    buyTaxGas: intelData.taxes?.buyGas || null,
    sellTaxGas: intelData.taxes?.sellGas || null,
  
    // Liquidity info (placeholder)
    lpLockPct: null, // Requires lock analysis
    lpLockDest: null, // Requires lock analysis

    // Token Age
    ageMinutes: intelData.tokenAge,

    // Social Links
    links: intelData.social || {},

    // REAL Holder Analysis from Moralis
    // inside the returned object:
holders: {
  total: hasRealHolderData ? holderAnalysis.totalHolders : null,
  top3: hasRealHolderData ? holderAnalysis.topHolders?.slice(0, 3) || [] : [],
  top10Pct: hasRealHolderData ? holderAnalysis.percentages?.top10Combined : null,
  top3Pct: hasRealHolderData ? holderAnalysis.percentages?.top3Combined : null,
  devTokens: hasRealHolderData ? holderAnalysis.devWallets : null,
  devSold: false,
  distribution: hasRealHolderData ? analyzeHolderDistribution(holderAnalysis) : 'Unknown',
  riskLevel: hasRealHolderData ? calculateHolderRiskLevel(holderAnalysis) : 'Unknown',
  dataQuality: holderDataQuality,
  isEstimated: holderAnalysis?.isEstimated || false,
  dataSource: 'Moralis',

  // NEW: feed the UI directly
  topHolders: hasRealHolderData ? (holderAnalysis.topHolders || []) : [],
  categories: holderAnalysis?.rawData?.stats?.holderDistribution || null
},


    // Four Meme Specific Data
    bondingCurveProgress: intelData.bondingCurveProgress,
    migrationStatus: intelData.migrationStatus,
    isFourMemeToken: intelData.isFourMemeToken,

    // Additional Trading Data
    trades24h: intelData.trades24h,
    txns24h: intelData.txns24h,
    buyers24h: intelData.buyers24h,
    sellers24h: intelData.sellers24h,
    priceChange24h: intelData.priceChange24h,
    volLiqRatio: intelData.volume24h && intelData.liquidity ? 
      Math.round((intelData.volume24h / intelData.liquidity) * 100) : null,

    // Metadata
    tokenType: intelData.tokenType,
    dataSources: Array.isArray(intelData.dataSources) 
      ? [...intelData.dataSources, 'Moralis']
      : typeof intelData.dataSources === 'object' 
        ? [...(intelData.dataSources.available || []), 'Moralis']
        : ['Moralis'],
    
    // Timestamp
    analyzedAt: new Date().toISOString()
  };
}

/**
 * Calculate holder-based risk score using real Moralis data
 */
function calculateHolderRiskScore(holderAnalysis) {
  if (!holderAnalysis || holderAnalysis.error || holderAnalysis.totalHolders === 0) return null;
  
  const { devWallets = 0, percentages = {}, totalHolders = 0, topHolders = [] } = holderAnalysis;
  const top10Percent = percentages.top10Combined || 0;

  let riskScore = 0;

  // Dev wallets risk (0-25 points)
  const devRatio = devWallets / totalHolders;
  if (devRatio > 0.1) riskScore += 25; // More than 10% dev wallets
  else if (devRatio > 0.05) riskScore += 15; // 5-10% dev wallets
  else if (devRatio > 0.02) riskScore += 10; // 2-5% dev wallets

  // Concentration risk based on actual percentages (0-40 points)
  if (top10Percent > 80) riskScore += 40; // Extreme concentration
  else if (top10Percent > 60) riskScore += 30; // High concentration
  else if (top10Percent > 40) riskScore += 20; // Medium concentration
  else if (top10Percent > 25) riskScore += 10; // Some concentration
  else if (top10Percent > 15) riskScore += 5; // Low concentration

  // Total holders risk (0-25 points)
  if (totalHolders < 50) riskScore += 25;
  else if (totalHolders < 200) riskScore += 15;
  else if (totalHolders < 500) riskScore += 10;
  else if (totalHolders < 1000) riskScore += 5;

  // Single holder dominance risk (0-10 points)
  if (topHolders.length > 0) {
    const topHolderPercent = topHolders[0]?.percentage || 0;
    if (topHolderPercent > 50) riskScore += 10; // Single holder owns majority
    else if (topHolderPercent > 25) riskScore += 5; // Single holder owns quarter
  }

  return Math.max(0, Math.min(100, Math.round(riskScore)));
}

/**
 * Estimate bundlers percentage from real Moralis holder patterns
 */
function calculateBundlersFromHolders(holderAnalysis) {
  if (!holderAnalysis || holderAnalysis.error || holderAnalysis.totalHolders === 0) return null;
  
  const { devWallets = 0, totalHolders = 0, topHolders = [] } = holderAnalysis;
  
  // Calculate dev wallet ratio
  const devRatio = (devWallets / totalHolders) * 100;
  
  // Look at top holder patterns for bundling indicators
  const contractHolders = topHolders.filter(holder => holder.isContract).length;
  const largeHolders = topHolders.filter(holder => holder.percentage > 1).length;
  
  // Base bundling estimate from dev ratio
  let bundlingEstimate = 0;
  if (devRatio > 15) bundlingEstimate = Math.min(60, devRatio * 2.5);
  else if (devRatio > 10) bundlingEstimate = Math.min(40, devRatio * 2);
  else if (devRatio > 5) bundlingEstimate = Math.min(25, devRatio * 1.5);
  else bundlingEstimate = Math.max(0, devRatio);
  
  // Adjust based on contract holders (contracts often indicate bundling)
  if (contractHolders > 5) bundlingEstimate += 10;
  else if (contractHolders > 2) bundlingEstimate += 5;
  
  // Adjust based on large holder count
  if (largeHolders > 10) bundlingEstimate += 5;
  
  return Math.round(Math.min(100, bundlingEstimate));
}

/**
 * Analyze holder distribution pattern with real Moralis data
 */
function analyzeHolderDistribution(holderAnalysis) {
  if (!holderAnalysis || holderAnalysis.error || holderAnalysis.totalHolders === 0) return 'Unknown';
  
  const { totalHolders = 0, percentages = {} } = holderAnalysis;
  const top10Percent = percentages.top10Combined || 0;

  // More precise distribution analysis with real data
  if (totalHolders < 50) return 'Very Concentrated';
  else if (totalHolders < 200 || top10Percent > 70) return 'Concentrated';
  else if (totalHolders < 500 || top10Percent > 50) return 'Moderately Concentrated';
  else if (totalHolders < 1500 || top10Percent > 30) return 'Moderate';
  else if (totalHolders < 5000 || top10Percent > 20) return 'Fairly Distributed';
  else if (top10Percent > 10) return 'Well Distributed';
  else return 'Highly Distributed';
}

/**
 * Calculate holder risk level using real Moralis data
 */
function calculateHolderRiskLevel(holderAnalysis) {
  const riskScore = calculateHolderRiskScore(holderAnalysis);
  if (riskScore === null) return 'Unknown';
  
  if (riskScore >= 80) return 'Very High';
  else if (riskScore >= 60) return 'High';
  else if (riskScore >= 40) return 'Medium';
  else if (riskScore >= 20) return 'Low';
  else return 'Very Low';
}

/**
 * Calculate a basic safety score enhanced with real Moralis holder data
 */
function calculateBasicSafetyScore(intelData, holderAnalysis) {
  let score = 50; // Base score

  // Market indicators
  if (intelData.liquidity > 100000) score += 15;
  else if (intelData.liquidity > 50000) score += 12;
  else if (intelData.liquidity > 10000) score += 8;
  else if (intelData.liquidity > 5000) score += 4;
  
  if (intelData.volume24h > 500000) score += 15;
  else if (intelData.volume24h > 100000) score += 12;
  else if (intelData.volume24h > 10000) score += 8;
  else if (intelData.volume24h > 1000) score += 4;
  
  if (intelData.social && Object.keys(intelData.social).length > 0) score += 8;
  if (intelData.tokenAge > 2880) score += 12; // > 48 hours
  else if (intelData.tokenAge > 1440) score += 8; // > 24 hours

  // Real Moralis holder analysis impact
  if (holderAnalysis && !holderAnalysis.error && holderAnalysis.totalHolders > 0) {
    const { totalHolders = 0, percentages = {} } = holderAnalysis;
    const top10Percent = percentages.top10Combined || 0;
    
    // Holder count bonus
    if (totalHolders > 10000) score += 20;
    else if (totalHolders > 5000) score += 18;
    else if (totalHolders > 2000) score += 15;
    else if (totalHolders > 1000) score += 12;
    else if (totalHolders > 500) score += 8;
    else if (totalHolders > 200) score += 5;
    else if (totalHolders > 100) score += 3;
    
    // Distribution impact - real percentages
    if (top10Percent < 10) score += 20; // Excellent distribution
    else if (top10Percent < 20) score += 15; // Very good distribution
    else if (top10Percent < 30) score += 10; // Good distribution
    else if (top10Percent < 50) score += 5; // Fair distribution
    else if (top10Percent > 80) score -= 25; // Very poor distribution
    else if (top10Percent > 60) score -= 15; // Poor distribution
  }

  // Four Meme adjustments
  if (intelData.isFourMemeToken) {
    if (intelData.bondingCurveProgress > 50) score += 5;
    if (intelData.migrationStatus === 'Completed') score += 10;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}