import type { DefaultMarketTemplate } from '$lib/types';

export const DEFAULT_MARKET_TEMPLATES: DefaultMarketTemplate[] = [
	{
		question: "What will [company_name]'s next valuation be?",
		market_type: 'CATEGORICAL',
		rules:
			"This market will resolve based on the company's next official fundraising round valuation or exit valuation.",
		expires_months: 24,
		outcomes: [
			{
				name: 'Under $10M',
				short_code: 'UNDER_10M',
				min_value: 0,
				max_value: 10_000_000,
				rep_value: 5_000_000
			},
			{
				name: '$10M-$50M',
				short_code: '10M_50M',
				min_value: 10_000_000,
				max_value: 50_000_000,
				rep_value: 30_000_000
			},
			{
				name: '$50M-$100M',
				short_code: '50M_100M',
				min_value: 50_000_000,
				max_value: 100_000_000,
				rep_value: 75_000_000
			},
			{
				name: '$100M-$500M',
				short_code: '100M_500M',
				min_value: 100_000_000,
				max_value: 500_000_000,
				rep_value: 300_000_000
			},
			{
				name: '$500M-$1B',
				short_code: '500M_1B',
				min_value: 500_000_000,
				max_value: 1_000_000_000,
				rep_value: 750_000_000
			},
			{
				name: 'Over $1B',
				short_code: 'OVER_1B',
				min_value: 1_000_000_000,
				rep_value: 1_500_000_000
			}
		]
	},
	{
		question: 'When will [company_name] reach unicorn status?',
		market_type: 'CATEGORICAL',
		rules:
			'This market will resolve when the company reaches a $1B+ valuation in any funding round or exit. If the company never reaches unicorn status, the "Never" option will win.',
		expires_months: 36,
		outcomes: [
			{ name: 'Within 6 months', short_code: '6M' },
			{ name: '6-12 months', short_code: '6_12M' },
			{ name: '1-2 years', short_code: '1_2Y' },
			{ name: '2-3 years', short_code: '2_3Y' },
			{ name: '3+ years', short_code: '3Y_PLUS' }
		]
	},
	{
		question: 'What year will [company_name] IPO?',
		market_type: 'CATEGORICAL',
		rules:
			'This market will resolve based on when the company goes public via IPO or direct listing. If the company is acquired or goes out of business without going public, "No IPO" will win.',
		expires_months: 60,
		outcomes: [
			{ name: '2025', short_code: '2025' },
			{ name: '2026', short_code: '2026' },
			{ name: '2027', short_code: '2027' },
			{ name: '2028', short_code: '2028' },
			{ name: '2029+', short_code: '2029_PLUS' }
		]
	},
	{
		question: "What will [company_name]'s ARR be 12 months from now?",
		market_type: 'CATEGORICAL',
		rules:
			"Resolves based on the company's annualized revenue (ARR = latest reported MRR × 12) at 12 months from company creation or market open. Use publicly announced figures or audited/internal reports shared by the company.",
		expires_months: 12,
		outcomes: [
			{
				name: 'Under $50k',
				short_code: 'UNDER_50K',
				min_value: 0,
				max_value: 50_000,
				rep_value: 25_000
			},
			{
				name: '$50k-$100k',
				short_code: '50K_100K',
				min_value: 50_000,
				max_value: 100_000,
				rep_value: 75_000
			},
			{
				name: '$100k-$250k',
				short_code: '100K_250K',
				min_value: 100_000,
				max_value: 250_000,
				rep_value: 175_000
			},
			{
				name: '$250k-$500k',
				short_code: '250K_500K',
				min_value: 250_000,
				max_value: 500_000,
				rep_value: 375_000
			},
			{
				name: '$500k-$1M',
				short_code: '500K_1M',
				min_value: 500_000,
				max_value: 1_000_000,
				rep_value: 750_000
			},
			{
				name: '$1M-$2M',
				short_code: '1M_2M',
				min_value: 1_000_000,
				max_value: 2_000_000,
				rep_value: 1_500_000
			},
			{
				name: '$2M-$5M',
				short_code: '2M_5M',
				min_value: 2_000_000,
				max_value: 5_000_000,
				rep_value: 3_000_000
			},
			{
				name: '$5M-$10M',
				short_code: '5M_10M',
				min_value: 5_000_000,
				max_value: 10_000_000,
				rep_value: 7_000_000
			},
			{
				name: '$10M-$20M',
				short_code: '10M_20M',
				min_value: 10_000_000,
				max_value: 20_000_000,
				rep_value: 15_000_000
			},
			{ name: 'Over $20M', short_code: 'OVER_20M', min_value: 20_000_000, rep_value: 30_000_000 }
		]
	},
	{
		question: 'When will [company_name] reach $1M ARR?',
		market_type: 'CATEGORICAL',
		rules:
			'Resolves when ARR (latest MRR × 12) first equals or exceeds $1,000,000 based on a public announcement or verifiable financial statement.',
		expires_months: 36,
		outcomes: [
			{ name: 'Within 3 months', short_code: '3M' },
			{ name: '3-6 months', short_code: '3_6M' },
			{ name: '6-9 months', short_code: '6_9M' },
			{ name: '9-12 months', short_code: '9_12M' },
			{ name: '12-18 months', short_code: '12_18M' },
			{ name: '18-24 months', short_code: '18_24M' },
			{ name: '24-36 months', short_code: '24_36M' },
			{ name: '36+ months', short_code: '36M_PLUS' }
		]
	},
	{
		question: "What will [company_name]'s team size be in 12 months?",
		market_type: 'CATEGORICAL',
		rules:
			'Resolves based on the number of full-time employees (FTEs) on payroll 12 months from company creation or market open. Contractors and interns excluded unless full-time FTEs.',
		expires_months: 12,
		outcomes: [
			{ name: '1-3', short_code: '1_3', min_value: 1, max_value: 3, rep_value: 2 },
			{ name: '4-7', short_code: '4_7', min_value: 4, max_value: 7, rep_value: 5 },
			{ name: '8-12', short_code: '8_12', min_value: 8, max_value: 12, rep_value: 10 },
			{ name: '13-20', short_code: '13_20', min_value: 13, max_value: 20, rep_value: 16 },
			{ name: '21-35', short_code: '21_35', min_value: 21, max_value: 35, rep_value: 28 },
			{ name: '36-50', short_code: '36_50', min_value: 36, max_value: 50, rep_value: 42 },
			{ name: '51-100', short_code: '51_100', min_value: 51, max_value: 100, rep_value: 75 },
			{ name: 'Over 100', short_code: 'OVER_100', min_value: 101, rep_value: 140 }
		]
	},
	{
		question: 'When will [company_name] raise their next round?',
		market_type: 'CATEGORICAL',
		rules:
			'Resolves on the announcement date of the next material financing (SAFE, priced equity, or debt) of ≥ $250k. If multiple tranches, use the first public announcement date.',
		expires_months: 36,
		outcomes: [
			{ name: 'Within 3 months', short_code: '3M' },
			{ name: '3-6 months', short_code: '3_6M' },
			{ name: '6-9 months', short_code: '6_9M' },
			{ name: '9-12 months', short_code: '9_12M' },
			{ name: '12-18 months', short_code: '12_18M' },
			{ name: '18-24 months', short_code: '18_24M' },
			{ name: '24+ months', short_code: '24M_PLUS' }
		]
	},
	{
		question: 'How much total capital will [company_name] raise within 24 months?',
		market_type: 'CATEGORICAL',
		rules:
			'Resolves to the sum of publicly announced primary capital raised (equity, SAFE/convertible, or debt) within 24 months from company creation or market open. Excludes secondary sales and grants under $100k.',
		expires_months: 24,
		outcomes: [
			{
				name: 'Under $500k',
				short_code: 'UNDER_500K',
				min_value: 0,
				max_value: 500_000,
				rep_value: 250_000
			},
			{
				name: '$500k-$1M',
				short_code: '500K_1M',
				min_value: 500_000,
				max_value: 1_000_000,
				rep_value: 750_000
			},
			{
				name: '$1M-$3M',
				short_code: '1M_3M',
				min_value: 1_000_000,
				max_value: 3_000_000,
				rep_value: 2_000_000
			},
			{
				name: '$3M-$5M',
				short_code: '3M_5M',
				min_value: 3_000_000,
				max_value: 5_000_000,
				rep_value: 4_000_000
			},
			{
				name: '$5M-$10M',
				short_code: '5M_10M',
				min_value: 5_000_000,
				max_value: 10_000_000,
				rep_value: 7_500_000
			},
			{
				name: '$10M-$20M',
				short_code: '10M_20M',
				min_value: 10_000_000,
				max_value: 20_000_000,
				rep_value: 15_000_000
			},
			{
				name: '$20M-$35M',
				short_code: '20M_35M',
				min_value: 20_000_000,
				max_value: 35_000_000,
				rep_value: 27_500_000
			},
			{
				name: '$35M-$50M',
				short_code: '35M_50M',
				min_value: 35_000_000,
				max_value: 50_000_000,
				rep_value: 42_500_000
			},
			{ name: 'Over $50M', short_code: 'OVER_50M', min_value: 50_000_000, rep_value: 75_000_000 }
		]
	}
];
