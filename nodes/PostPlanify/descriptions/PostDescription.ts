import type { INodeProperties } from 'n8n-workflow';

import {
	PLATFORM_OPTIONS,
	platformSettingsField,
	returnAllFields,
	simplifyField,
	socialAccountField,
	workspaceField,
} from './shared';

const show = (operation: string[]) => ({ resource: ['post'], operation });

export const postOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['post'] } },
		options: [
			{
				name: 'Cancel',
				value: 'cancel',
				description: 'Stop a scheduled post from publishing. It is kept as cancelled.',
				action: 'Cancel a post',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Schedule a post with text, images or videos to one social account',
				action: 'Create a post',
			},
			{
				name: 'Delete',
				value: 'delete',
				description:
					'Delete a post from PostPlanify. Scheduled posts are cancelled; published posts stay on the social network.',
				action: 'Delete a post',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a post with its status, publish time and engagement metrics',
				action: 'Get a post',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many posts in a workspace',
				action: 'Get many posts',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Change the caption, publish time or platform settings of a scheduled post',
				action: 'Update a post',
			},
		],
		default: 'create',
	},
];

export const postFields: INodeProperties[] = [
	// ----------------------------------------
	//              post: create
	// ----------------------------------------
	workspaceField(show(['create'])),
	socialAccountField(show(['create']), true, 'The connected account to post to.'),
	{
		displayName: 'Caption',
		name: 'caption',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		displayOptions: { show: show(['create']) },
		description: 'The post text. A post needs a caption, media, or both.',
	},
	{
		displayName: 'Publish At',
		name: 'scheduledAt',
		type: 'dateTime',
		default: '',
		displayOptions: { show: show(['create']) },
		description:
			'When to publish. Leave empty to publish in about 5 minutes. Add a time zone offset (e.g. Z or +02:00) when using an expression.',
	},
	{
		displayName: 'Media',
		name: 'media',
		type: 'collection',
		placeholder: 'Add Media',
		default: {},
		displayOptions: { show: show(['create']) },
		description:
			'Images, videos or PDFs (LinkedIn) for the post, up to 100 MB each. Instagram, TikTok, YouTube and Pinterest posts need media. Files are added in this order: binary fields, URLs, then existing media IDs.',
		options: [
			{
				displayName: 'Input Binary Fields',
				name: 'binaryPropertyNames',
				type: 'string',
				default: 'data',
				placeholder: 'e.g. data, data_1',
				description:
					'Comma-separated names of the binary fields that hold files from a previous node, e.g. an HTTP Request or Google Drive download',
			},
			{
				displayName: 'Media URLs',
				name: 'mediaUrls',
				type: 'string',
				default: '',
				placeholder: 'e.g. https://example.com/photo.jpg',
				description: 'Comma-separated public URLs. PostPlanify downloads each file.',
			},
			{
				displayName: 'Existing Media IDs',
				name: 'mediaIds',
				type: 'string',
				default: '',
				description:
					'Comma-separated IDs from the Upload Media operation or your PostPlanify media library',
			},
		],
	},
	platformSettingsField(show(['create']), true),
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: show(['create']) },
		options: [
			{
				displayName: 'Shorten Links with Bitly',
				name: 'shortenLinks',
				type: 'boolean',
				default: false,
				description:
					'Whether to shorten links in the caption when the post is published. Needs Bitly connected to the workspace in PostPlanify.',
			},
			{
				displayName: 'UTM Campaign',
				name: 'utmCampaign',
				type: 'string',
				default: '',
				placeholder: 'e.g. black_friday',
				description: 'Campaign name added to shortened links',
			},
		],
	},

	// ----------------------------------------
	//     post: get, update, cancel, delete
	// ----------------------------------------
	workspaceField(
		show(['get', 'update', 'cancel', 'delete']),
		false,
		'Only used to list posts in the Post field below. Not needed when you pass a post ID.',
	),
	{
		displayName: 'Post',
		name: 'postId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: { show: show(['get', 'update', 'cancel', 'delete']) },
		description:
			'The post. Update and Cancel list scheduled posts only, since published or cancelled posts cannot be changed.',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: { searchListMethod: 'searchPosts', searchable: true },
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. 3c1d5e7a-2b4f-4a6c-8d9e-1f2a3b4c5d6e',
			},
		],
	},

	simplifyField(show(['get'])),

	// ----------------------------------------
	//              post: update
	// ----------------------------------------
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: show(['update']) },
		options: [
			{
				displayName: 'Caption',
				name: 'caption',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				description: 'The new post text',
			},
			{
				displayName: 'Publish At',
				name: 'scheduledAt',
				type: 'dateTime',
				default: '',
				description: 'The new publish time',
			},
			{
				displayName: 'Shorten Links with Bitly',
				name: 'shortenLinks',
				type: 'boolean',
				default: false,
				description: 'Whether to shorten links in the caption when the post is published',
			},
			{
				displayName: 'UTM Campaign',
				name: 'utmCampaign',
				type: 'string',
				default: '',
				description: 'Campaign name added to shortened links',
			},
		],
	},
	platformSettingsField(show(['update']), false),

	// ----------------------------------------
	//              post: getAll
	// ----------------------------------------
	workspaceField(show(['getAll'])),
	socialAccountField(show(['getAll']), false, 'Only posts for this account. Leave empty for all accounts.'),
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
				displayName: 'From',
				name: 'from',
				type: 'dateTime',
				default: '',
				description: 'Only posts scheduled at or after this time',
			},
			{
				displayName: 'Include Metrics',
				name: 'includeMetrics',
				type: 'boolean',
				default: false,
				description: 'Whether to add the latest engagement metrics to published posts',
			},
			{
				displayName: 'Platform',
				name: 'platform',
				type: 'options',
				options: PLATFORM_OPTIONS,
				default: 'INSTAGRAM',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Cancelled', value: 'CANCELLED' },
					{ name: 'Published', value: 'PUBLISHED' },
					{ name: 'Rescheduled', value: 'RESCHEDULED' },
					{ name: 'Scheduled', value: 'SCHEDULED' },
				],
				default: 'SCHEDULED',
			},
			{
				displayName: 'To',
				name: 'to',
				type: 'dateTime',
				default: '',
				description: 'Only posts scheduled at or before this time',
			},
		],
	},
];
