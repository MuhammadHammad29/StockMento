import { Lesson } from './types';

// Comprehensive lesson structure for all 10 courses
// Following text → video → quiz pattern for each course
export const comprehensiveLessons: Lesson[] = [
  // Course 1: PSX Fundamentals - 8 lessons (4 text, 3 video, 1 quiz)
  {
    id: 'lesson-1-1',
    courseId: 'course-1',
    title: 'Introduction to Pakistan Stock Exchange',
    description: 'Overview of PSX history, structure, and importance in Pakistani economy.',
    type: 'text',
    content: `# Introduction to Pakistan Stock Exchange

The Pakistan Stock Exchange (PSX) is the country's largest stock exchange, formed through the integration of three former exchanges: the Karachi Stock Exchange, Lahore Stock Exchange, and Islamabad Stock Exchange.

## History and Evolution

PSX has a rich history dating back to 1947, when the Karachi Stock Exchange was established shortly after Pakistan's independence. Over the decades, it has evolved into a modern, technology-driven exchange that serves as the backbone of Pakistan's capital markets.

## Market Structure

The PSX operates as a demutualized exchange, meaning it is owned by shareholders rather than its trading members. This structure promotes:

- **Transparency** in operations and governance
- **Efficiency** in market operations
- **Innovation** in products and services
- **Growth** in market capitalization

## Key Statistics

- **Listed Companies**: Over 560 companies across various sectors
- **Market Capitalization**: Approximately PKR 7.5 trillion
- **Trading Hours**: Monday to Friday, 9:15 AM to 3:30 PM PST
- **Settlement**: T+2 (Trade date plus 2 working days)

## Importance in Economy

PSX plays a crucial role in Pakistan's economic development by:

1. **Capital Formation**: Enabling companies to raise funds for expansion
2. **Liquidity**: Providing a platform for investors to buy and sell securities
3. **Price Discovery**: Establishing fair market prices for securities
4. **Economic Indicator**: Serving as a barometer of economic health`,
    duration: 15,
    order: 1,
    isLocked: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-12-01'),
  },
  {
    id: 'lesson-1-2',
    courseId: 'course-1',
    title: 'Understanding Market Structure',
    description: 'Learn about market participants, trading mechanisms, and regulatory framework.',
    type: 'text',
    content: `# Understanding Market Structure

## Market Participants

### 1. Investors
- **Individual Investors**: Retail investors buying/selling for personal accounts
- **Institutional Investors**: Mutual funds, insurance companies, banks

### 2. Intermediaries
- **Brokers**: Licensed to execute trades on behalf of clients
- **Market Makers**: Provide liquidity by quoting buy/sell prices

### 3. Regulators
- **SECP**: Securities and Exchange Commission of Pakistan
- **PSX**: Self-regulatory organization

## Trading Mechanisms

### Order Types
- **Market Orders**: Execute immediately at current market price
- **Limit Orders**: Execute only at specified price or better
- **Stop Orders**: Triggered when price reaches certain level

### Settlement Process
- **T+2 Settlement**: Trades settle two working days after execution
- **Central Depository**: CDC maintains electronic records
- **Clearing**: NCCPL acts as central counterparty

## Regulatory Framework

The PSX operates under comprehensive regulations ensuring:
- Market integrity
- Investor protection
- Fair price discovery
- Systemic risk management`,
    duration: 18,
    order: 2,
    isLocked: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-12-01'),
  },
  {
    id: 'lesson-1-3',
    courseId: 'course-1',
    title: 'Investment Basics and Terminology',
    description: 'Essential investment concepts and terminology for PSX trading.',
    type: 'text',
    content: `# Investment Basics and Terminology

## Key Investment Terms

### Equity Securities
- **Shares/Stocks**: Ownership stakes in companies
- **Market Capitalization**: Total value of company's shares
- **Blue Chips**: Shares of large, established companies
- **Growth Stocks**: Companies with high growth potential

### Debt Securities
- **Bonds**: Fixed-income securities
- **Government Securities**: Treasury bills, bonds
- **Corporate Bonds**: Company-issued debt

### Market Indices
- **KSE-100**: Main benchmark index
- **All-Share Index**: Broader market representation
- **Sector Indices**: Industry-specific performance

## Investment Strategies

### Value Investing
- Focus on undervalued companies
- Long-term perspective
- Fundamental analysis emphasis

### Growth Investing
- Target companies with high growth rates
- Higher risk/reward profile
- Future potential focus

### Diversification
- Spread investments across sectors
- Reduce portfolio risk
- Balance potential returns

## Risk Concepts

### Types of Risk
- **Market Risk**: Overall market movements
- **Credit Risk**: Company-specific defaults
- **Liquidity Risk**: Difficulty selling positions
- **Inflation Risk**: Purchasing power erosion`,
    duration: 20,
    order: 3,
    isLocked: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-12-01'),
  },
  {
    id: 'lesson-1-4',
    courseId: 'course-1',
    title: 'Getting Started with PSX Investing',
    description: 'Practical steps to begin investing in Pakistani stock market.',
    type: 'text',
    content: `# Getting Started with PSX Investing

## Opening a Trading Account  

### Required Documents
- National Identity Card (CNIC)
- Bank account details
- Passport-size photographs
- Income/employment verification

### Choosing a Broker
- **Full-Service Brokers**: Complete advisory services
- **Discount Brokers**: Low-cost execution only
- **Online Platforms**: Digital trading interfaces
## Setting Investment Goals
### Time Horizon
- **Short-term** (1-2 years): Conservative approach
- **Medium-term** (3-7 years): Balanced strategy
- **Long-term** (8+ years): Growth-oriented
### Risk Tolerance
- **Conservative**: Capital preservation focus
- **Moderate**: Balanced growth and safety
- **Aggressive**: Maximum growth potential
## Investment Process
### Research and Analysis
1. Company fundamental analysis
2. Market trend evaluation
3. Sector performance review
4. Economic indicator assessment
### Portfolio Construction
- Asset allocation strategy
- Diversification across sectors
- Position sizing decisions
- Risk management rules
### Monitoring and Review
- Regular performance evaluation
- Rebalancing when needed
- Strategy adjustments
- Tax optimization`,

    duration: 25,
    order: 4,
    isLocked: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-12-01'),
  },
  {
    id: 'lesson-1-5',
    courseId: 'course-1',
    title: 'PSX Trading Platform Overview',
    description: 'Video tour of PSX trading platforms and order execution.',
    type: 'video',
    videoUrl: 'https://www.youtube.com/watch?v=p7HKvqRI_Bo',
    duration: 22,
    order: 5,
    isLocked: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-12-01'),
  },
  {
    id: 'lesson-1-6',
    courseId: 'course-1',
    title: 'Live Trading Demonstration',
    description: 'Step-by-step demonstration of placing and managing trades.',
    type: 'video',
    videoUrl: 'https://www.youtube.com/watch?v=08c8nf8X2cw',
    duration: 28,
    order: 6,
    isLocked: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-12-01'),
  },
  {
    id: 'lesson-1-7',
    courseId: 'course-1',
    title: 'Market Analysis Walkthrough',
    description: 'Practical example of analyzing PSX stocks and market conditions.',
    type: 'video',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: 30,
    order: 7,
    isLocked: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-12-01'),
  },
  {
    id: 'lesson-1-8',
    courseId: 'course-1',
    title: 'PSX Fundamentals Assessment',
    description: 'Test your understanding of PSX basics and market fundamentals.',
    type: 'quiz',
    quizId: 'quiz-1-1',
    duration: 20,
    order: 8,
    isLocked: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-12-01'),
  },

  // Course 2: Technical Analysis - 10 lessons (5 text, 4 video, 1 quiz)
  {
    id: 'lesson-2-1',
    courseId: 'course-2',
    title: 'Introduction to Technical Analysis',
    description: 'Fundamental principles and philosophy of technical analysis.',
    type: 'text',
    content: `# Introduction to Technical Analysis

## What is Technical Analysis?

Technical analysis is the study of market action, primarily through the use of charts, for the purpose of forecasting future price trends. It is based on the premise that all market fundamentals are reflected in market prices.

## Core Principles

### 1. Market Action Discounts Everything
- All fundamental factors are reflected in price
- Economic, political, and psychological factors
- Supply and demand dynamics

### 2. Prices Move in Trends
- Trends have direction and momentum
- Identifying trend direction is crucial
- Trends persist until reversal signals appear

### 3. History Repeats Itself
- Market patterns recur over time
- Human psychology drives market behavior
- Past patterns help predict future movements

## Types of Charts

### Line Charts
- Connect closing prices
- Show overall price direction
- Simple trend identification

### Bar Charts
- Show open, high, low, close (OHLC)
- More detailed price information
- Better for pattern recognition

### Candlestick Charts
- Visual representation of OHLC
- Color-coded for easy interpretation
- Enhanced pattern recognition`,
    duration: 20,
    order: 1,
    isLocked: false,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-12-05'),
  },
  {
    id: 'lesson-2-2',
    courseId: 'course-2',
    title: 'Chart Patterns and Trends',
    description: 'Learn to identify and interpret major chart patterns.',
    type: 'text',
    content: `# Chart Patterns and Trends

## Trend Analysis

### Uptrend
- Higher highs and higher lows
- Bullish market sentiment
- Support line connects low points

### Downtrend
- Lower highs and lower lows
- Bearish market sentiment
- Resistance line connects high points

### Sideways Trend
- Horizontal price movement
- Consolidation phase
- Range-bound trading

## Reversal Patterns

### Head and Shoulders
- Three peaks with middle highest
- Bearish reversal pattern
- Neckline break confirms reversal

### Double Top/Bottom
- Two equal highs or lows
- Strong reversal signal
- Volume confirmation important

### Triangles
- **Ascending**: Higher lows, horizontal highs
- **Descending**: Lower highs, horizontal lows
- **Symmetrical**: Converging trend lines

## Continuation Patterns

### Flags and Pennants
- Brief consolidation in strong trend
- Usually last 1-3 weeks
- Breakout in trend direction

### Rectangles
- Horizontal support and resistance
- Price oscillates between levels
- Breakout determines direction`,
    duration: 25,
    order: 2,
    isLocked: false,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-12-05'),
  },
  {
    id: 'lesson-2-3',
    courseId: 'course-2',
    title: 'Support and Resistance Levels',
    description: 'Understanding key price levels and their significance.',
    type: 'text',
    content: `# Support and Resistance Levels

## Support Levels

### Definition
- Price level where buying interest emerges
- Prevents further price decline
- Acts as a "floor" for prices

### Characteristics
- Multiple touches increase strength
- Volume confirms validity
- Psychological round numbers

### Trading Implications
- Buying opportunities near support
- Stop losses below support
- Broken support becomes resistance

## Resistance Levels

### Definition
- Price level where selling pressure emerges
- Prevents further price advance
- Acts as a "ceiling" for prices

### Characteristics
- Previous highs often act as resistance
- Volume spikes at resistance
- Round numbers create barriers

### Trading Implications
- Selling opportunities near resistance
- Breakouts above resistance bullish
- Failed breakouts create entries

## Role Reversal

### Support to Resistance
- Broken support becomes resistance
- Previous buyers become trapped
- Creates selling pressure

### Resistance to Support
- Broken resistance becomes support
- Previous sellers cover positions
- Creates buying interest`,
    duration: 22,
    order: 3,
    isLocked: false,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-12-05'),
  },
  {
    id: 'lesson-2-4',
    courseId: 'course-2',
    title: 'Moving Averages and Indicators',
    description: 'Technical indicators and their practical applications.',
    type: 'text',
    content: `# Moving Averages and Indicators

## Moving Averages

### Simple Moving Average (SMA)
- Average of closing prices over period
- Smooths price fluctuations
- Trend identification tool

### Exponential Moving Average (EMA)
- Gives more weight to recent prices
- More responsive to price changes
- Better for short-term trading

### Moving Average Crossovers
- **Golden Cross**: 50-day above 200-day (bullish)
- **Death Cross**: 50-day below 200-day (bearish)
- Signal trend changes

## Momentum Indicators

### RSI (Relative Strength Index)
- Measures speed of price changes
- Range: 0-100
- Overbought (>70), Oversold (<30)

### MACD (Moving Average Convergence Divergence)
- Two moving averages relationship
- Signal line crossovers
- Histogram shows momentum

### Stochastic Oscillator
- Compares closing price to range
- %K and %D lines
- Oversold/overbought conditions

## Volume Indicators

### On-Balance Volume (OBV)
- Relates volume to price changes
- Confirms price trends
- Divergence signals

### Volume Moving Average
- Average volume over period
- Above-average volume confirms moves
- Below-average suggests weakness`,
    duration: 28,
    order: 4,
    isLocked: false,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-12-05'),
  },
  {
    id: 'lesson-2-5',
    courseId: 'course-2',
    title: 'Candlestick Pattern Analysis',
    description: 'Comprehensive guide to Japanese candlestick patterns.',
    type: 'text',
    content: `# Candlestick Pattern Analysis

## Single Candlestick Patterns

### Doji
- Open and close nearly equal
- Indecision in market
- Potential reversal signal

### Hammer/Hanging Man
- Small body, long lower shadow
- Hammer at bottom (bullish)
- Hanging man at top (bearish)

### Shooting Star/Inverted Hammer
- Small body, long upper shadow
- Shooting star at top (bearish)
- Inverted hammer at bottom (bullish)

## Two-Candlestick Patterns

### Engulfing Patterns
- **Bullish Engulfing**: White candle engulfs black
- **Bearish Engulfing**: Black candle engulfs white
- Strong reversal signals

### Piercing Pattern/Dark Cloud Cover
- **Piercing**: White candle penetrates black body
- **Dark Cloud**: Black candle penetrates white body
- Moderate reversal signals

## Three-Candlestick Patterns

### Morning Star/Evening Star
- **Morning Star**: Reversal at bottom (bullish)
- **Evening Star**: Reversal at top (bearish)
- Three-candle formation

### Three White Soldiers/Three Black Crows
- **Three White Soldiers**: Three advancing white candles
- **Three Black Crows**: Three declining black candles
- Strong continuation signals`,
    duration: 26,
    order: 5,
    isLocked: false,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-12-05'),
  },
  {
    id: 'lesson-2-6',
    courseId: 'course-2',
    title: 'Chart Analysis Demonstration',
    description: 'Live analysis of PSX stocks using technical indicators.',
    type: 'video',
    videoUrl: 'https://www.youtube.com/watch?v=08c8nf8X2cw',
    duration: 35,
    order: 6,
    isLocked: false,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-12-05'),
  },
  {
    id: 'lesson-2-7',
    courseId: 'course-2',
    title: 'Setting Up Technical Analysis Tools',
    description: 'Configure charts and indicators for effective analysis.',
    type: 'video',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: 25,
    order: 7,
    isLocked: false,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-12-05'),
  },
  {
    id: 'lesson-2-8',
    courseId: 'course-2',
    title: 'Pattern Recognition Practice',
    description: 'Hands-on practice identifying patterns in real charts.',
    type: 'video',
    videoUrl: 'https://www.youtube.com/watch?v=p7HKvqRI_Bo',
    duration: 30,
    order: 8,
    isLocked: false,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-12-05'),
  },
  {
    id: 'lesson-2-9',
    courseId: 'course-2',
    title: 'Advanced Technical Strategies',
    description: 'Complex technical analysis strategies for experienced traders.',
    type: 'video',
    videoUrl: 'https://www.youtube.com/watch?v=08c8nf8X2cw',
    duration: 40,
    order: 9,
    isLocked: false,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-12-05'),
  },
  {
    id: 'lesson-2-10',
    courseId: 'course-2',
    title: 'Technical Analysis Mastery Quiz',
    description: 'Comprehensive assessment of technical analysis skills.',
    type: 'quiz',
    quizId: 'quiz-2-1',
    duration: 25,
    order: 10,
    isLocked: false,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-12-05'),
  },

  // Course 3: Risk Management - 6 lessons (3 text, 2 video, 1 quiz)
  {
    id: 'lesson-3-1',
    courseId: 'course-3',
    title: 'Understanding Investment Risk',
    description: 'Types of risks in Pakistani stock market investing.',
    type: 'text',
    content: `# Understanding Investment Risk

## Definition of Risk

Investment risk refers to the probability of losing money or not achieving expected returns on an investment. In the context of PSX, understanding various risk types is crucial for successful investing.

## Types of Investment Risk

### Market Risk (Systematic Risk)
- **Definition**: Risk affecting entire market
- **Causes**: Economic conditions, political events, natural disasters
- **Examples**: Market crashes, economic recessions
- **Mitigation**: Cannot be diversified away completely

### Credit Risk
- **Definition**: Risk of company defaulting on obligations
- **Factors**: Company financial health, debt levels
- **Assessment**: Credit ratings, financial statements
- **Impact**: Bond defaults, dividend cuts

### Liquidity Risk
- **Definition**: Difficulty in buying/selling securities
- **Causes**: Low trading volume, market conditions
- **Consequences**: Price impact, timing delays
- **Management**: Focus on actively traded stocks

### Inflation Risk
- **Definition**: Erosion of purchasing power
- **Impact**: Real returns reduction
- **Protection**: Growth assets, inflation-linked securities
- **Long-term consideration**: Important for retirement planning

### Currency Risk
- **Definition**: Foreign exchange rate fluctuations
- **Relevance**: Foreign investments, multinational companies
- **Hedging**: Currency forwards, natural hedging
- **PSX context**: Limited for domestic stocks`,
    duration: 18,
    order: 1,
    isLocked: false,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-12-10'),
  },
  {
    id: 'lesson-3-2',
    courseId: 'course-3',
    title: 'Portfolio Diversification Strategies',
    description: 'Building resilient portfolios through diversification.',
    type: 'text',
    content: `# Portfolio Diversification Strategies

## Principles of Diversification

### Asset Class Diversification
- **Equities**: Growth and value stocks
- **Fixed Income**: Government and corporate bonds
- **Cash Equivalents**: Money market instruments
- **Alternative Investments**: REITs, commodities

### Sector Diversification
- **Financial Services**: Banks, insurance companies
- **Industrial**: Manufacturing, construction
- **Energy**: Oil & gas, power generation
- **Technology**: IT services, telecommunications
- **Consumer Goods**: FMCG, textiles

### Geographic Diversification
- **Domestic Focus**: PSX-listed companies
- **International Exposure**: Multinational corporations
- **Regional Balance**: Different provinces/regions
- **Market Cap Distribution**: Large, mid, small cap

## Risk-Return Optimization

### Correlation Analysis
- **Low Correlation**: Reduces portfolio volatility
- **Negative Correlation**: Provides hedge benefits
- **Asset Selection**: Based on correlation matrix
- **Rebalancing**: Maintain target allocations

### Modern Portfolio Theory
- **Efficient Frontier**: Optimal risk-return combinations
- **Sharp Ratio**: Risk-adjusted returns
- **Beta Coefficients**: Market sensitivity measures
- **Optimal Allocation**: Maximize utility`,
    duration: 22,
    order: 2,
    isLocked: false,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-12-10'),
  },
  {
    id: 'lesson-3-3',
    courseId: 'course-3',
    title: 'Risk Assessment and Management Tools',
    description: 'Practical tools and techniques for managing investment risk.',
    type: 'text',
    content: `# Risk Assessment and Management Tools

## Risk Measurement Metrics

### Volatility Measures
- **Standard Deviation**: Historical price volatility
- **Beta**: Market sensitivity coefficient
- **VaR (Value at Risk)**: Potential loss estimation
- **Maximum Drawdown**: Largest peak-to-trough decline

### Risk-Adjusted Returns
- **Sharpe Ratio**: Excess return per unit of risk
- **Treynor Ratio**: Return per unit of systematic risk
- **Information Ratio**: Active return per tracking error
- **Calmar Ratio**: Annual return divided by maximum drawdown

## Risk Management Techniques

### Position Sizing
- **Fixed Dollar Amount**: Equal monetary allocation
- **Percentage of Portfolio**: Risk-based allocation
- **Kelly Criterion**: Optimal betting strategy
- **Risk Parity**: Equal risk contribution

### Stop-Loss Strategies
- **Fixed Percentage**: Set percentage below entry
- **Technical Levels**: Support/resistance based
- **Trailing Stops**: Follow favorable price movements
- **Time-Based Exits**: Predetermined holding periods

### Hedging Strategies
- **Sector Rotation**: Defensive positioning
- **Cash Reserves**: Liquidity maintenance
- **Inverse Correlation**: Hedge assets
- **Options Strategies**: Protective puts, covered calls`,
    duration: 25,
    order: 3,
    isLocked: false,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-12-10'),
  },
  {
    id: 'lesson-3-4',
    courseId: 'course-3',
    title: 'Risk Management in Practice',
    description: 'Real-world application of risk management principles.',
    type: 'video',
    videoUrl: 'https://www.youtube.com/watch?v=p7HKvqRI_Bo',
    duration: 30,
    order: 4,
    isLocked: false,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-12-10'),
  },
  {
    id: 'lesson-3-5',
    courseId: 'course-3',
    title: 'Building a Risk-Managed Portfolio',
    description: 'Step-by-step portfolio construction with risk controls.',
    type: 'video',
    videoUrl: 'https://www.youtube.com/watch?v=08c8nf8X2cw',
    duration: 35,
    order: 5,
    isLocked: false,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-12-10'),
  },
  {
    id: 'lesson-3-6',
    courseId: 'course-3',
    title: 'Risk Management Assessment',
    description: 'Test your understanding of risk management principles.',
    type: 'quiz',
    quizId: 'quiz-3-1',
    duration: 20,
    order: 6,
    isLocked: false,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-12-10'),
  },

  // Course 4: Fundamental Analysis - 12 lessons (6 text, 5 video, 1 quiz)
  {
    id: 'lesson-4-1',
    courseId: 'course-4',
    title: 'Introduction to Fundamental Analysis',
    description: 'Basic principles of company and economic analysis.',
    type: 'text',
    content: `# Introduction to Fundamental Analysis

## What is Fundamental Analysis?

Fundamental analysis is a method of evaluating securities by analyzing economic, financial, and other qualitative and quantitative factors that affect their intrinsic value.

## Core Components

### Economic Analysis
- **Macroeconomic Indicators**: GDP, inflation, interest rates
- **Government Policies**: Fiscal and monetary policies
- **Political Stability**: Impact on business environment
- **Currency Strength**: Effects on exports and imports

### Industry Analysis
- **Industry Life Cycle**: Growth, maturity, decline phases
- **Competitive Landscape**: Market share, competition intensity
- **Regulatory Environment**: Government regulations and policies
- **Supply Chain Dynamics**: Raw material availability and pricing

### Company Analysis
- **Financial Statements**: Income statement, balance sheet, cash flow
- **Management Quality**: Leadership effectiveness and strategy
- **Competitive Advantages**: Unique selling propositions
- **Business Model**: Revenue streams and cost structure

## Key Financial Ratios

### Profitability Ratios
- **Return on Equity (ROE)**: Net income / shareholders' equity
- **Return on Assets (ROA)**: Net income / total assets
- **Gross Profit Margin**: (Revenue - COGS) / Revenue
- **Net Profit Margin**: Net income / Revenue

### Valuation Ratios
- **Price-to-Earnings (P/E)**: Market price / Earnings per share
- **Price-to-Book (P/B)**: Market price / Book value per share
- **Price-to-Sales (P/S)**: Market cap / Revenue
- **Enterprise Value ratios**: EV/EBITDA, EV/Sales`,
    duration: 20,
    order: 1,
    isLocked: false,
    createdAt: new Date('2024-04-01'),
    updatedAt: new Date('2024-12-12'),
  },
  {
    id: 'lesson-4-2',
    courseId: 'course-4',
    title: 'Financial Statement Analysis',
    description: 'Deep dive into analyzing company financial statements.',
    type: 'text',
    content: `# Financial Statement Analysis

## Income Statement Analysis

### Revenue Analysis
- **Revenue Growth**: Year-over-year growth trends
- **Revenue Quality**: Recurring vs. one-time revenue
- **Geographic Mix**: Revenue by region/market
- **Product Mix**: Revenue by product line

### Expense Analysis
- **Cost of Goods Sold**: Direct production costs
- **Operating Expenses**: SG&A, R&D expenses
- **Interest Expenses**: Debt service costs
- **Tax Efficiency**: Effective tax rates

## Balance Sheet Analysis

### Assets Analysis
- **Current Assets**: Cash, inventory, receivables
- **Fixed Assets**: Property, plant, equipment
- **Intangible Assets**: Patents, goodwill, brand value
- **Asset Turnover**: Efficiency in asset utilization

### Liabilities and Equity
- **Current Liabilities**: Short-term obligations
- **Long-term Debt**: Debt maturity and terms
- **Shareholders' Equity**: Retained earnings, paid-in capital
- **Debt-to-Equity Ratio**: Financial leverage assessment

## Cash Flow Statement Analysis

### Operating Cash Flow
- **Cash from Operations**: Core business cash generation
- **Working Capital Changes**: Impact on cash flow
- **Quality of Earnings**: Cash vs. accounting earnings
- **Cash Conversion Cycle**: Efficiency metrics

### Investment and Financing Activities
- **Capital Expenditures**: Growth investments
- **Free Cash Flow**: Available for distributions
- **Dividend Policy**: Cash distribution strategy
- **Share Buybacks**: Capital allocation decisions`,
    duration: 25,
    order: 2,
    isLocked: false,
    createdAt: new Date('2024-04-01'),
    updatedAt: new Date('2024-12-12'),
  },
  {
    id: 'lesson-4-3',
    courseId: 'course-4',
    title: 'Valuation Models and Techniques',
    description: 'Methods for determining intrinsic value of stocks.',
    type: 'text',
    content: `# Valuation Models and Techniques

## Discounted Cash Flow (DCF) Model

### Free Cash Flow Projections
- **Revenue Forecasting**: Growth assumptions
- **Margin Analysis**: Operating efficiency trends
- **Capital Requirements**: Maintenance vs. growth capex
- **Working Capital Needs**: Operating asset requirements

### Discount Rate Calculation
- **Cost of Equity**: CAPM model application
- **Cost of Debt**: After-tax borrowing costs
- **Weighted Average Cost of Capital (WACC)**
- **Risk Adjustments**: Country and company-specific risks

## Comparable Company Analysis

### Multiple Selection
- **P/E Multiples**: Earnings-based valuation
- **EV/EBITDA**: Enterprise value multiples
- **P/B Ratios**: Book value comparisons
- **Industry-Specific Multiples**: Sector-relevant metrics

### Peer Group Selection
- **Business Model Similarity**: Comparable operations
- **Size Considerations**: Market cap ranges
- **Geographic Focus**: Market exposure
- **Growth Profiles**: Similar growth trajectories

## Asset-Based Valuation

### Book Value Methods
- **Tangible Book Value**: Physical asset value
- **Replacement Cost**: Current replacement value
- **Liquidation Value**: Distressed sale value
- **Economic Book Value**: Market-adjusted values

### Sum-of-Parts Valuation
- **Business Segment Analysis**: Individual unit valuation
- **Conglomerate Discount**: Diversification penalty
- **Spin-off Analysis**: Standalone valuations
- **Portfolio Optimization**: Asset allocation efficiency`,
    duration: 28,
    order: 3,
    isLocked: false,
    createdAt: new Date('2024-04-01'),
    updatedAt: new Date('2024-12-12'),
  },
  {
    id: 'lesson-4-4',
    courseId: 'course-4',
    title: 'Industry and Sector Analysis',
    description: 'Analyzing industries and sectors within Pakistani economy.',
    type: 'text',
    content: `# Industry and Sector Analysis

## Pakistani Industry Landscape

### Financial Services Sector
- **Banking**: Commercial banks, Islamic banking
- **Insurance**: Life and general insurance companies
- **Capital Markets**: Brokerage firms, asset management
- **Regulatory Environment**: SBP and SECP oversight

### Manufacturing Sector
- **Textiles**: Largest manufacturing sector
- **Chemicals**: Fertilizers, pharmaceuticals, paints
- **Steel and Cement**: Infrastructure-related industries
- **Automotive**: Assembly and parts manufacturing

### Energy Sector
- **Oil and Gas**: Exploration and production companies
- **Power Generation**: Thermal, hydro, renewable energy
- **Distribution**: Gas and electricity distribution
- **Refining**: Petroleum product processing

## Industry Analysis Framework

### Porter's Five Forces
- **Competitive Rivalry**: Intensity of competition
- **Threat of New Entrants**: Barriers to entry
- **Bargaining Power of Suppliers**: Input cost control
- **Bargaining Power of Buyers**: Customer concentration
- **Threat of Substitutes**: Alternative products/services

### Industry Life Cycle
- **Emerging Stage**: High growth, high risk
- **Growth Stage**: Rapid expansion, increasing profits
- **Maturity Stage**: Stable growth, intense competition
- **Decline Stage**: Decreasing demand, consolidation

## Sector-Specific Metrics

### Banking Metrics
- **Net Interest Margin**: Interest income efficiency
- **Cost-to-Income Ratio**: Operational efficiency
- **Loan Loss Provisions**: Credit quality
- **Return on Assets/Equity**: Profitability measures

### Manufacturing Metrics
- **Asset Turnover**: Asset utilization efficiency
- **Inventory Turnover**: Working capital management
- **Capacity Utilization**: Production efficiency
- **Raw Material Cost Trends**: Input cost analysis`,
    duration: 24,
    order: 4,
    isLocked: false,
    createdAt: new Date('2024-04-01'),
    updatedAt: new Date('2024-12-12'),
  },
  {
    id: 'lesson-4-5',
    courseId: 'course-4',
    title: 'Economic Indicators and Market Analysis',
    description: 'Understanding macroeconomic factors affecting stock prices.',
    type: 'text',
    content: `# Economic Indicators and Market Analysis

## Key Economic Indicators

### GDP and Growth Metrics
- **Real GDP Growth**: Economic expansion measurement
- **GDP per Capita**: Standard of living indicator
- **Sectoral Contribution**: Industry-wise growth analysis
- **Regional Development**: Provincial economic performance

### Inflation and Monetary Policy
- **Consumer Price Index (CPI)**: Inflation measurement
- **Core Inflation**: Excluding volatile items
- **Interest Rate Policy**: SBP monetary policy decisions
- **Money Supply Growth**: Liquidity conditions

### External Sector Indicators
- **Balance of Trade**: Exports vs. imports
- **Current Account Balance**: External financing needs
- **Foreign Exchange Reserves**: Economic stability
- **Exchange Rate Trends**: Currency strength/weakness

## Market Sentiment Indicators

### Consumer Confidence
- **Consumer Sentiment Index**: Spending behavior
- **Retail Sales Growth**: Consumer demand
- **Vehicle Sales**: Big-ticket purchases
- **Housing Market**: Real estate activity

### Business Confidence
- **Manufacturing PMI**: Production activity
- **Capacity Utilization**: Industrial efficiency
- **Business Investment**: Capital expenditure trends
- **Employment Data**: Job market conditions

## Policy Impact Analysis

### Fiscal Policy Effects
- **Government Spending**: Public investment impact
- **Tax Policy Changes**: Corporate and personal taxation
- **Budget Deficit**: Fiscal sustainability
- **Public Debt Levels**: Debt servicing capacity

### Regulatory Changes
- **Industry-Specific Regulations**: Sector impact
- **Environmental Policies**: Compliance costs
- **International Trade Agreements**: Market access
- **Financial Sector Reforms**: Banking and capital markets`,
    duration: 26,
    order: 5,
    isLocked: false,
    createdAt: new Date('2024-04-01'),
    updatedAt: new Date('2024-12-12'),
  },
  {
    id: 'lesson-4-6',
    courseId: 'course-4',
    title: 'Management and Corporate Governance',
    description: 'Evaluating management quality and governance practices.',
    type: 'text',
    content: `# Management and Corporate Governance

## Management Quality Assessment

### Leadership Evaluation
- **Track Record**: Historical performance
- **Strategic Vision**: Long-term planning capability
- **Communication**: Transparency and clarity
- **Stakeholder Relations**: Investor, employee, customer relations

### Operational Excellence
- **Execution Capability**: Strategy implementation
- **Innovation**: Product/service development
- **Cost Management**: Operational efficiency
- **Risk Management**: Risk identification and mitigation

## Corporate Governance Framework

### Board Structure
- **Board Independence**: Non-executive directors
- **Board Diversity**: Skills, experience, gender diversity
- **Committee Structure**: Audit, risk, compensation committees
- **Board Evaluation**: Regular performance assessment

### Disclosure and Transparency
- **Financial Reporting**: Accuracy and timeliness
- **Related Party Transactions**: Conflict of interest management
- **Material Information**: Timely disclosure
- **Investor Communications**: Regular updates and guidance

## Shareholder Rights and Protection

### Ownership Structure
- **Shareholding Pattern**: Promoter vs. public ownership
- **Voting Rights**: Equal treatment of shareholders
- **Minority Protection**: Safeguarding small investors
- **Anti-Takeover Measures**: Fair market practices

### Dividend Policy
- **Dividend History**: Consistency and growth
- **Payout Ratios**: Distribution vs. retention
- **Dividend Yield**: Income generation
- **Special Dividends**: Excess cash distribution

## Red Flags and Warning Signs

### Financial Red Flags
- **Accounting Irregularities**: Revenue recognition issues
- **Related Party Transactions**: Unusual transactions
- **Audit Qualifications**: External auditor concerns
- **Frequent Management Changes**: Leadership instability

### Operational Red Flags
- **Market Share Loss**: Competitive position deterioration
- **Customer Concentration**: Over-reliance on few customers
- **Regulatory Issues**: Compliance violations
- **Labor Relations**: Industrial disputes`,
    duration: 22,
    order: 6,
    isLocked: false,
    createdAt: new Date('2024-04-01'),
    updatedAt: new Date('2024-12-12'),
  },
  {
    id: 'lesson-4-7',
    courseId: 'course-4',
    title: 'Financial Statement Analysis Workshop',
    description: 'Hands-on analysis of Pakistani company financial statements.',
    type: 'video',
    videoUrl: 'https://www.youtube.com/watch?v=p7HKvqRI_Bo',
    duration: 45,
    order: 7,
    isLocked: false,
    createdAt: new Date('2024-04-01'),
    updatedAt: new Date('2024-12-12'),
  },
  {
    id: 'lesson-4-8',
    courseId: 'course-4',
    title: 'DCF Valuation Walkthrough',
    description: 'Step-by-step DCF model construction for PSX stock.',
    type: 'video',
    videoUrl: 'https://www.youtube.com/watch?v=08c8nf8X2cw',
    duration: 40,
    order: 8,
    isLocked: false,
    createdAt: new Date('2024-04-01'),
    updatedAt: new Date('2024-12-12'),
  },
  {
    id: 'lesson-4-9',
    courseId: 'course-4',
    title: 'Comparable Company Analysis Demo',
    description: 'Practical application of relative valuation methods.',
    type: 'video',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: 35,
    order: 9,
    isLocked: false,
    createdAt: new Date('2024-04-01'),
    updatedAt: new Date('2024-12-12'),
  },
  {
    id: 'lesson-4-10',
    courseId: 'course-4',
    title: 'Industry Analysis Practice',
    description: 'Comprehensive analysis of Pakistani banking sector.',
    type: 'video',
    videoUrl: 'https://www.youtube.com/watch?v=p7HKvqRI_Bo',
    duration: 38,
    order: 10,
    isLocked: false,
    createdAt: new Date('2024-04-01'),
    updatedAt: new Date('2024-12-12'),
  },
  {
    id: 'lesson-4-11',
    courseId: 'course-4',
    title: 'Economic Analysis and Stock Selection',
    description: 'Integrating macroeconomic analysis with stock selection.',
    type: 'video',
    videoUrl: 'https://www.youtube.com/watch?v=08c8nf8X2cw',
    duration: 32,
    order: 11,
    isLocked: false,
    createdAt: new Date('2024-04-01'),
    updatedAt: new Date('2024-12-12'),
  },
  {
    id: 'lesson-4-12',
    courseId: 'course-4',
    title: 'Fundamental Analysis Mastery Test',
    description: 'Comprehensive assessment of fundamental analysis skills.',
    type: 'quiz',
    quizId: 'quiz-4-1',
    duration: 30,
    order: 12,
    isLocked: false,
    createdAt: new Date('2024-04-01'),
    updatedAt: new Date('2024-12-12'),
  }
];
