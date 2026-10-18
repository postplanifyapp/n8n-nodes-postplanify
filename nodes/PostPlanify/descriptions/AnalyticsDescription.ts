import type { INodeProperties } from 'n8n-workflow';

import { socialAccountField, workspaceField } from './shared';

const show = (operation: string[]) => ({ resource: ['analytics'], operation });

export const analyticsOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['analytics'] } },
		options: [
			{
				name: 'Get Account Analytics',
				value: 'getAccount',
				description:
					'Get the latest analytics for one social account, including per-post metrics. Fields depend on the platform.',
				action: 'Get account analytics',
			},
			{
				name: 'Get Account Trends',
				value: 'getTrends',
				description: 'Get daily views, likes, comments, shares and follower counts for one account',
				action: 'Get account trends',
			},
			{
				name: 'Get Workspace Overview',
				value: 'getOverview',
				description:
					'Get the last 7 days for every account in a workspace: followers, views, engagement and top posts',
				action: 'Get workspace overview',
			},
		],
		default: 'getOverview',
	},
];

export const analyticsFields: INodeProperties[] = [
	workspaceField(show(['getOverview', 'getAccount', 'getTrends'])),
	socialAccountField(show(['getAccount', 'getTrends'])),
	{
		displayName: 'Days',
		name: 'days',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 365 },
		default: 30,
		displayOptions: { show: show(['getTrends']) },
		description: 'How many days back to include',
	},
];
