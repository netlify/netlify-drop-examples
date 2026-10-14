/**
 * Policy for the Pipeline & ARR dashboard: stages, probabilities, churn and
 * fiscal-year definitions, saved-query wiring and data classification.
 *
 * Every entry carries `{ value, description, inferred }` metadata that feeds
 * the "How these metrics are calculated" panel. `inferred: true` means the
 * value is an assumption the builder should confirm for their business.
 */
export type Policy<T> = { value: T; description: string; inferred: boolean }

export const dashboardConfig = {
  stages: {
    value: [
      { name: 'Prospecting', probability: 0.1 },
      { name: 'Discovery', probability: 0.2 },
      { name: 'Proposal', probability: 0.4 },
      { name: 'Negotiation', probability: 0.7 },
      { name: 'Commit', probability: 0.9 },
    ],
    description: 'Open-deal stages in order, with the win probability used for weighted pipeline.',
    inferred: true,
  } satisfies Policy<Array<{ name: string; probability: number }>>,
  churnDefinition: {
    value: 'zero-or-absent',
    description:
      'An account is churned when its ARR goes from above zero to zero, or it is absent from a month’s snapshot. An account that returns after churning counts as new ARR.',
    inferred: true,
  } satisfies Policy<string>,
  fiscalYearStartMonth: {
    value: 2, // 1 = January … 12 = December
    description: 'Fiscal year starts in February; quarters are three months each.',
    inferred: true,
  } satisfies Policy<number>,
  closedWonAmountIsArr: {
    value: true,
    description: 'The amount on a won opportunity is treated as ARR.',
    inferred: true,
  } satisfies Policy<boolean>,
  segments: ['SMB', 'Mid-Market', 'Enterprise'] as const,
  // Snowflake saved-query IDs per dataset (see src/config/saved-queries.ts).
  datasetQueries: {
    opportunities: 'opportunities_v1',
    arr_snapshots: 'arr_snapshots_v1',
  } as const,
  // Salesforce opportunities refresh (src/datasets/adapters/salesforce.ts).
  salesforce: {
    value: {
      // Salesforce StageName -> dashboard stage, for OPEN deals. Defaults are
      // Salesforce's standard Opportunity stage picklist. An open deal whose
      // stage isn't listed fails the refresh (nothing is stored).
      stageMap: {
        Prospecting: 'Prospecting',
        Qualification: 'Prospecting',
        'Needs Analysis': 'Discovery',
        'Value Proposition': 'Discovery',
        'Id. Decision Makers': 'Discovery',
        'Perception Analysis': 'Discovery',
        'Proposal/Price Quote': 'Proposal',
        'Negotiation/Review': 'Negotiation',
      } as Record<string, string>,
      // Closed deals (IsClosed) get this stage; status comes from IsWon.
      closedStage: 'Commit',
      // SOQL field path for `segment`. Most orgs use a custom field such as
      // Account.Segment__c; must be a plain dotted field path.
      segmentField: 'Account.Type',
      // Opportunities with a close date on/after Jan 1 this many years ago.
      lookbackYears: 3,
    },
    description:
      'Salesforce stages map onto the pipeline stages above; closed deals take the last stage and won/lost comes from IsWon. Segment comes from Account.Type.',
    inferred: true,
  } satisfies Policy<{
    stageMap: Record<string, string>
    closedStage: string
    segmentField: string
    lookbackYears: number
  }>,
  dataClassification: { tier: 2, label: 'Confidential business data' },
} as const

export const stageNames = dashboardConfig.stages.value.map((s) => s.name) as Array<string>
export type DatasetId = keyof typeof dashboardConfig.datasetQueries
