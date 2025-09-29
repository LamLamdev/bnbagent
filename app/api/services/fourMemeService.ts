// app/api/services/fourMemeService.js
// @ts-nocheck

const BITQUERY_BASE_URL = 'https://graphql.bitquery.io';
const FOUR_MEME_PROXY_ADDRESS = '0x5c952063c7fc8610ffdb798152d69f0b9550762b';

export class FourMemeService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async getTokenData(tokenAddress) {
    try {
      const [
        bondingCurveData,
        tradeMetrics,
        tokenInfo
      ] = await Promise.allSettled([
        this.getBondingCurveProgress(tokenAddress),
        this.getTradeMetrics(tokenAddress),
        this.getTokenInfo(tokenAddress)
      ]);

      return this.formatFourMemeData({
        bondingCurve: bondingCurveData.status === 'fulfilled' ? bondingCurveData.value : null,
        tradeMetrics: tradeMetrics.status === 'fulfilled' ? tradeMetrics.value : null,
        tokenInfo: tokenInfo.status === 'fulfilled' ? tokenInfo.value : null,
        tokenAddress
      });
    } catch (error) {
      console.error('Four Meme API error:', error);
      throw error;
    }
  }

  async getBondingCurveProgress(tokenAddress) {
    const query = `
      query($token: String!, $proxyAddress: String!) {
        EVM(dataset: realtime, network: bsc) {
          Events(
            limit: {count: 1}
            orderBy: {descending: Block_Number}
            where: {
              LogHeader: {Address: {is: $proxyAddress}}
              Log: {Signature: {Name: {is: "LiquidityAdded"}}}
              Arguments: {includes: {Name: {is: "token1"}, Value: {Address: {is: $token}}}}
            }
          ) {
            Block {
              Time
              Number
            }
            Arguments {
              Name
              Value {
                ... on EVM_ABI_Integer_Value_Arg {
                  integer
                }
                ... on EVM_ABI_BigInt_Value_Arg {
                  bigInteger
                }
              }
            }
          }
        }
      }
    `;

    const response = await this.makeGraphQLRequest(query, {
      token: tokenAddress,
      proxyAddress: FOUR_MEME_PROXY_ADDRESS
    });

    const events = response?.data?.EVM?.Events;
    if (!events || events.length === 0) return null;

    // Find the token balance argument from the LiquidityAdded event
    const event = events[0];
    let tokenBalance = 0;

    event.Arguments?.forEach(arg => {
      if (arg.Name === 'amount1' || arg.Name === 'tokenAmount') {
        // Get the token amount added to liquidity
        tokenBalance = parseFloat(arg.Value.bigInteger || arg.Value.integer || 0);
      }
    });

    // Convert from wei to tokens (assuming 18 decimals for Four Meme tokens)
    const balance = tokenBalance / Math.pow(10, 18);
    
    // Bonding Curve Formula: 100 - (((balance - 200000000) * 100) / 800000000)
    // Note: This formula assumes the balance represents remaining tokens in bonding curve
    const progress = 100 - (((balance - 200000000) * 100) / 800000000);
    const clampedProgress = Math.max(0, Math.min(100, progress));

    return {
      balance,
      progress: clampedProgress,
      isCompleted: clampedProgress >= 100,
      lastEventTime: event.Block.Time
    };
  }

  async getTradeMetrics(tokenAddress) {
    // Generate datetime variables for 24hr, 1hr, 5min ago
    const now = new Date();
    const time24hrAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const time1hrAgo = new Date(now - 60 * 60 * 1000).toISOString();
    const time5minAgo = new Date(now - 5 * 60 * 1000).toISOString();

    const query = `
      query($currency: String!, $time_24hr_ago: DateTime!, $time_1hr_ago: DateTime!, $time_5min_ago: DateTime!) {
        EVM(network: bsc) {
          DEXTradeByTokens(
            where: {
              Trade: {
                Currency: {SmartContract: {is: $currency}}
                Success: true
              }
              Block: {Time: {since: $time_24hr_ago}}
            }
          ) {
            Trade {
              Currency {
                Name
                Symbol
                SmartContract
              }
            }
            volume_24hr: sum(of: Trade_Side_AmountInUSD)
            volume_1hr: sum(of: Trade_Side_AmountInUSD, if: {Block: {Time: {since: $time_1hr_ago}}})
            volume_5min: sum(of: Trade_Side_AmountInUSD, if: {Block: {Time: {since: $time_5min_ago}}})
            trades_24hr: count
            trades_1hr: count(if: {Block: {Time: {since: $time_1hr_ago}}})
            trades_5min: count(if: {Block: {Time: {since: $time_5min_ago}}})
          }
        }
      }
    `;

    const response = await this.makeGraphQLRequest(query, {
      currency: tokenAddress,
      time_24hr_ago: time24hrAgo,
      time_1hr_ago: time1hrAgo,
      time_5min_ago: time5minAgo
    });

    const data = response?.data?.EVM?.DEXTradeByTokens?.[0];
    if (!data) return null;

    return {
      volume24h: parseFloat(data.volume_24hr) || 0,
      volume1h: parseFloat(data.volume_1hr) || 0,
      volume5min: parseFloat(data.volume_5min) || 0,
      trades24h: data.trades_24hr || 0,
      trades1h: data.trades_1hr || 0,
      trades5min: data.trades_5min || 0,
      tokenInfo: data.Trade?.Currency
    };
  }

  async getTokenInfo(tokenAddress) {
    const query = `
      query($token: String!) {
        EVM(network: bsc) {
          Transfers(
            where: {Transfer: {Currency: {SmartContract: {is: $token}}}}
            orderBy: {ascending: Block_Time}
            limit: {count: 1}
          ) {
            Currency {
              SmartContract
              Name
              Symbol
              Decimals
            }
            Block {
              Time
            }
          }
        }
      }
    `;

    const response = await this.makeGraphQLRequest(query, { token: tokenAddress });
    const data = response?.data?.EVM?.Transfers?.[0];

    if (!data) return null;

    return {
      name: data.Currency.Name,
      symbol: data.Currency.Symbol,
      decimals: data.Currency.Decimals,
      smartContract: data.Currency.SmartContract,
      createdAt: data.Block.Time
    };
  }

  formatFourMemeData(data) {
    const { bondingCurve, tradeMetrics, tokenInfo, tokenAddress } = data;

    console.log('Bonding curve data:', bondingCurve);
    console.log('Trade metrics data:', tradeMetrics);
    console.log('Token info data:', tokenInfo);

    // Use token info from trade metrics if available, fallback to tokenInfo query
    const tokenData = tradeMetrics?.tokenInfo || tokenInfo;

    return {
      // Token Info
      tokenName: tokenData?.Name || 'Unknown',
      tokenSymbol: tokenData?.Symbol || 'UNKNOWN',
      tokenAddress: tokenAddress,
      createdAt: tokenInfo?.createdAt || null,
      
      // Four Meme Specific
      bondingCurveProgress: bondingCurve?.progress || 0,
      isCompleted: bondingCurve?.isCompleted || false,
      migrationStatus: bondingCurve?.isCompleted ? 'Completed' : 'Pre-migration',
      
      // Market Data
      volume24h: tradeMetrics?.volume24h || 0,
      volume1h: tradeMetrics?.volume1h || 0,
      volume5min: tradeMetrics?.volume5min || 0,
      trades24h: tradeMetrics?.trades24h || 0,
      trades1h: tradeMetrics?.trades1h || 0,
      trades5min: tradeMetrics?.trades5min || 0,
      
      // Liquidity (from bonding curve event data)
      liquidity: bondingCurve?.balance ? Math.max(0, bondingCurve.balance) : null,
      
      // Source identifier
      dataSource: 'fourmeme'
    };
  }

  async makeGraphQLRequest(query, variables = {}) {
    const response = await fetch(BITQUERY_BASE_URL, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        query,
        variables
      })
    });

    if (!response.ok) {
      throw new Error(`Bitquery API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      throw new Error(`GraphQL error: ${result.errors[0]?.message || 'Unknown error'}`);
    }

    return result;
  }
}