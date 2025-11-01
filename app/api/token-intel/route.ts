// app/api/token-intel/route.ts
// @ts-nocheck

import { TokenIntelligenceService } from '../services/tokenIntelService.ts';
import HeliusService from '../services/heliusService.js'; // Changed from Moralis

// simple prebond detector: no liq + no mc + (no price OR no activity)
function isLikelyPrebond(intel: any) {
  const zeroish = (v: any) => v === 0 || v === null || v === undefined;
  return (
    zeroish(intel?.liquidity) &&
    zeroish(intel?.marketCap) &&
    (zeroish(intel?.price) || zeroish(intel?.txns24h))
  );
}

// Initialize Helius service with environment variable
const helius = new HeliusService(process.env.HELIUS_API_KEY);

export async function POST(request) {
  try {
    const body = await request.json();
    const { tokenAddress, chainId = 'solana' } = body;

    // Validate input
    if (!tokenAddress) {
      return Response.json(
        { error: 'Token address is required' },
        { status: 400 }
      );
    }

    // Validate Solana address format (base58, 32-44 characters)
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(tokenAddress)) {
      return Response.json(
        { error: 'Invalid Solana token address format' },
        { status: 400 }
      );
    }

    // Initialize service
    const tokenIntel = new TokenIntelligenceService();

    // Get token intelligence data and holder analysis in parallel
    console.log(`Analyzing Solana token ${tokenAddress} with Helius holder data...`);
    
    const [intelData, holderAnalysis] = await Promise.all([
      tokenIntel.getCompleteTokenIntel(tokenAddress, chainId),
      helius.getCompleteHolderAnalysis(tokenAddress) // Using Helius instead of Moralis
    ]);

    // Add logging here:
    console.log('Raw intel data before transform:', intelData);
    console.log('Helius holder analysis data:', holderAnalysis);

    if (isLikelyPrebond(intelData)) {
      return Response.json({
        success: true,
        data: {
          isPrebond: true,
          prebondReason: 'No liquidity/market data (likely pre-bonded).',
          tokenName: intelData?.tokenName || 'Unknown Token',
          symbol: intelData?.symbol || 'UNKNOWN',
          contract: tokenAddress,
          chain: 'Solana',
          analyzedAt: new Date().toISOString(),
        },
      });
    }
    
    // Transform data to match frontend format (now with real holder data from Helius)
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
        { error: 'Invalid Solana token address format' },
        { status: 400 }
      );
    }

    if (error.message.includes('Token not found')) {
      return Response.json(
        { error: 'Token not found on Solana' },
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
  const chainId = searchParams.get('chain') || 'solana';

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
 * Now includes Helius real holder analysis data
 */
function transformToFrontendFormat(intelData, holderAnalysis) {
  // Handle case where token wasn't found
  if (intelData.error) {
    return {
      error: intelData.error,
      tokenName: 'Unknown Token',
      symbol: 'UNKNOWN',
      contract: intelData.contract,
      chain: 'Solana'
    };
  }

  // Handle Helius holder data
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

    // Safety & Risk Assessment (enhanced with Helius data)
    safetyScore: basicSafetyScore,
    bundlersPct: hasRealHolderData ? calculateBundlersFromHolders(holderAnalysis) : 
                 intelData.riskAssessment?.bundlers || null,
    honeypot: intelData.riskAssessment?.honeypot || false,
    rugRatioPct: holderRiskScore, // Use holder concentration as rug risk indicator

    // Market Data
    mcUSD: intelData.marketCap || null,
    liquidityUSD: intelData.liquidity || null,
    volume24hUSD: intelData.volume24h || null,
    
    // Trading taxes (Solana has no taxes typically, but keeping for compatibility)
    buyTaxPct: intelData.taxes?.buy || null,
    sellTaxPct: intelData.taxes?.sell || null,
    buyTaxGas: intelData.taxes?.buyGas || null,
    sellTaxGas: intelData.taxes?.sellGas || null,
  
    // Liquidity info (placeholder)
    lpLockPct: null,
    lpLockDest: null,

    // Token Age
    ageMinutes: intelData.tokenAge,

    // Social Links
    links: intelData.social || {},

    // REAL Holder Analysis from Helius
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
      dataSource: 'Helius',

      // Feed the UI directly
      topHolders: hasRealHolderData ? (holderAnalysis.topHolders || []) : [],
      categories: holderAnalysis?.rawData?.stats?.holderDistribution || null
    },

    // Pump.fun / Raydium Specific Data
    bondingCurveProgress: intelData.bondingCurveProgress,
    migrationStatus: intelData.migrationStatus,
    isPumpFunToken: intelData.isPumpFunToken || false,

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
      ? [...intelData.dataSources, 'Helius']
      : typeof intelData.dataSources === 'object' 
        ? [...(intelData.dataSources.available || []), 'Helius']
        : ['Helius'],
    
    // Timestamp
    analyzedAt: new Date().toISOString()
  };
}

/**
 * Calculate holder-based risk score using real Helius data
 */
function calculateHolderRiskScore(holderAnalysis) {
  if (!holderAnalysis || holderAnalysis.error || holderAnalysis.totalHolders === 0) return null;
  
  const { devWallets = 0, percentages = {}, totalHolders = 0, topHolders = [] } = holderAnalysis;
  const top10Percent = percentages.top10Combined || 0;

  let riskScore = 0;

  // Dev wallets risk (0-25 points)
  const devRatio = devWallets / totalHolders;
  if (devRatio > 0.1) riskScore += 25;
  else if (devRatio > 0.05) riskScore += 15;
  else if (devRatio > 0.02) riskScore += 10;

  // Concentration risk based on actual percentages (0-40 points)
  if (top10Percent > 80) riskScore += 40;
  else if (top10Percent > 60) riskScore += 30;
  else if (top10Percent > 40) riskScore += 20;
  else if (top10Percent > 25) riskScore += 10;
  else if (top10Percent > 15) riskScore += 5;

  // Total holders risk (0-25 points)
  if (totalHolders < 50) riskScore += 25;
  else if (totalHolders < 200) riskScore += 15;
  else if (totalHolders < 500) riskScore += 10;
  else if (totalHolders < 1000) riskScore += 5;

  // Single holder dominance risk (0-10 points)
  if (topHolders.length > 0) {
    const topHolderPercent = topHolders[0]?.percentage || 0;
    if (topHolderPercent > 50) riskScore += 10;
    else if (topHolderPercent > 25) riskScore += 5;
  }

  return Math.max(0, Math.min(100, Math.round(riskScore)));
}

/**
 * Estimate bundlers percentage from real Helius holder patterns
 */
function calculateBundlersFromHolders(holderAnalysis) {
  if (!holderAnalysis || holderAnalysis.error || holderAnalysis.totalHolders === 0) return null;
  
  const { devWallets = 0, totalHolders = 0, topHolders = [] } = holderAnalysis;
  
  const devRatio = (devWallets / totalHolders) * 100;
  const largeHolders = topHolders.filter(holder => holder.percentage > 1).length;
  
  let bundlingEstimate = 0;
  if (devRatio > 15) bundlingEstimate = Math.min(60, devRatio * 2.5);
  else if (devRatio > 10) bundlingEstimate = Math.min(40, devRatio * 2);
  else if (devRatio > 5) bundlingEstimate = Math.min(25, devRatio * 1.5);
  else bundlingEstimate = Math.max(0, devRatio);
  
  if (largeHolders > 10) bundlingEstimate += 5;
  
  return Math.round(Math.min(100, bundlingEstimate));
}

/**
 * Analyze holder distribution pattern with real Helius data
 */
function analyzeHolderDistribution(holderAnalysis) {
  if (!holderAnalysis || holderAnalysis.error || holderAnalysis.totalHolders === 0) return 'Unknown';
  
  const { totalHolders = 0, percentages = {} } = holderAnalysis;
  const top10Percent = percentages.top10Combined || 0;

  if (totalHolders < 50) return 'Very Concentrated';
  else if (totalHolders < 200 || top10Percent > 70) return 'Concentrated';
  else if (totalHolders < 500 || top10Percent > 50) return 'Moderately Concentrated';
  else if (totalHolders < 1500 || top10Percent > 30) return 'Moderate';
  else if (totalHolders < 5000 || top10Percent > 20) return 'Fairly Distributed';
  else if (top10Percent > 10) return 'Well Distributed';
  else return 'Highly Distributed';
}

/**
 * Calculate holder risk level using real Helius data
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
 * Calculate a basic safety score enhanced with real Helius holder data
 */
function calculateBasicSafetyScore(intelData, holderAnalysis) {
  let score = 50;

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
  if (intelData.tokenAge > 2880) score += 12;
  else if (intelData.tokenAge > 1440) score += 8;

  // Real Helius holder analysis impact
  if (holderAnalysis && !holderAnalysis.error && holderAnalysis.totalHolders > 0) {
    const { totalHolders = 0, percentages = {} } = holderAnalysis;
    const top10Percent = percentages.top10Combined || 0;
    
    if (totalHolders > 10000) score += 20;
    else if (totalHolders > 5000) score += 18;
    else if (totalHolders > 2000) score += 15;
    else if (totalHolders > 1000) score += 12;
    else if (totalHolders > 500) score += 8;
    else if (totalHolders > 200) score += 5;
    else if (totalHolders > 100) score += 3;
    
    if (top10Percent < 10) score += 20;
    else if (top10Percent < 20) score += 15;
    else if (top10Percent < 30) score += 10;
    else if (top10Percent < 50) score += 5;
    else if (top10Percent > 80) score -= 25;
    else if (top10Percent > 60) score -= 15;
  }

  // Pump.fun adjustments
  if (intelData.isPumpFunToken) {
    if (intelData.bondingCurveProgress > 50) score += 5;
    if (intelData.migrationStatus === 'Graduated') score += 10;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}