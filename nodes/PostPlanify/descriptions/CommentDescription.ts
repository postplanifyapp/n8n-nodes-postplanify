import type { INodeProperties } from 'n8n-workflow';

import {
	INBOX_PLATFORM_OPTIONS,
	returnAllFields,
	simplifyField,
	socialAccountField,
	workspaceField,
} from './shared';

const show = (operation: string[]) => ({ resource: ['comment'], operation });

export const commentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['comment'] } },
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				description:
					'Get comments on your Facebook, Instagram and LinkedIn posts, and Google Business reviews',
				action: 'Get many comments',
			},
			{
				name: 'Get Replies',
				value: 'getReplies',
				description: 'Get the replies to a comment, oldest first',
				action: 'Get replies to a comment',
			},
			{
				name: 'Reply',
				value: 'reply',
				description: 'Reply to a comment or Google Business review from your connected account',
				action: 'Reply to a comment',
			},
		],
		default: 'getAll',
	},
];

export const commentFields: INodeProperties[] = [
	// ----------------------------------------
	//              comment: getAll
	// ----------------------------------------
	workspaceField(show(['getAll'])),
	socialAccountField(show(['getAll']), false, 'Only comments on this account. Leave empty for all accounts.'),
	...returnAllFields(show(['getAll']), 500),
	simplifyField(show(['getAll'])),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: show(['getAll']) },
		options: [
			{
				displayName: 'Platform',
				name: 'platform',
				type: 'options',
				options: INBOX_PLATFORM_OPTIONS,
				default: 'INSTAGRAM',
			},
			{
				displayName: 'Unread Only',
				name: 'unreadOnly',
				type: 'boolean',
				default: false,
				description: 'Whether to return only comments not yet read in the PostPlanify inbox',
			},
		],
	},

	// ----------------------------------------
	//        comment: reply, getReplies
	// ----------------------------------------
	{
		displayName: 'Comment ID',
		name: 'commentId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: show(['reply', 'getReplies']) },
		description: 'The comment ID, e.g. from the PostPlanify Trigger or Get Many comments',
	},
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		typeOptions: { rows: 3 },
		required: true,
		default: '',
		displayOptions: { show: show(['reply']) },
		description:
			'The reply. Max length depends on the platform, e.g. Instagram 2,200, LinkedIn 1,250 and Facebook 8,000 characters.',
	},
];
