import type { INodeProperties } from 'n8n-workflow';

import { PLATFORM_OPTIONS, socialAccountField, workspaceField } from './shared';

// Workspace and Social Account are read-only resources, used to look up IDs
// and account details for other steps.

const showWorkspace = (operation: string[]) => ({ resource: ['workspace'], operation });
const showAccount = (operation: string[]) => ({ resource: ['socialAccount'], operation });

export const workspaceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['workspace'] } },
		options: [
			{ name: 'Get', value: 'get', description: 'Get a workspace', action: 'Get a workspace' },
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many workspaces you can access',
				action: 'Get many workspaces',
			},
		],
		default: 'getAll',
	},
];

export const workspaceFields: INodeProperties[] = [workspaceField(showWorkspace(['get']))];

export const socialAccountOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['socialAccount'] } },
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a connected social account',
				action: 'Get a social account',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get the social accounts connected in a workspace',
				action: 'Get many social accounts',
			},
		],
		default: 'getAll',
	},
];

export const socialAccountFields: INodeProperties[] = [
	workspaceField(showAccount(['get', 'getAll'])),
	socialAccountField(showAccount(['get'])),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: showAccount(['getAll']) },
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Matches part of the account name or custom label',
			},
			{
				displayName: 'Platform',
				name: 'platform',
				type: 'options',
				options: PLATFORM_OPTIONS,
				default: 'INSTAGRAM',
			},
		],
	},
];
