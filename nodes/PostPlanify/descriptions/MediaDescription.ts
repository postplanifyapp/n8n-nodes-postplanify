import type { INodeProperties } from 'n8n-workflow';

import { returnAllFields, workspaceField } from './shared';

const show = (operation: string[]) => ({ resource: ['media'], operation });

export const mediaOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['media'] } },
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete media you uploaded through n8n or the API',
				action: 'Delete media',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get your API uploads and, optionally, a workspace media library',
				action: 'Get many media',
			},
			{
				name: 'Upload',
				value: 'upload',
				description: 'Upload an image, video or PDF and get its media ID for use in posts',
				action: 'Upload media',
			},
		],
		default: 'upload',
	},
];

export const mediaFields: INodeProperties[] = [
	// ----------------------------------------
	//              media: upload
	// ----------------------------------------
	{
		displayName: 'Source',
		name: 'source',
		type: 'options',
		options: [
			{ name: 'Binary File', value: 'binary', description: 'A file from a previous node' },
			{ name: 'URL', value: 'url', description: 'A public URL that PostPlanify downloads' },
		],
		default: 'binary',
		displayOptions: { show: show(['upload']) },
	},
	{
		displayName: 'Input Binary Field',
		name: 'binaryPropertyName',
		type: 'string',
		required: true,
		default: 'data',
		displayOptions: { show: { ...show(['upload']), source: ['binary'] } },
		description: 'The name of the binary field that holds the file. JPEG, PNG, GIF, WebP, MP4, MOV or PDF, up to 100 MB.',
	},
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. https://example.com/photo.jpg',
		displayOptions: { show: { ...show(['upload']), source: ['url'] } },
		description: 'Public URL of the file. JPEG, PNG, GIF, WebP, MP4, MOV or PDF, up to 100 MB.',
	},
	{
		displayName: 'File Name',
		name: 'filename',
		type: 'string',
		default: '',
		displayOptions: { show: { ...show(['upload']), source: ['url'] } },
		description: 'Optional. Defaults to the name in the URL.',
	},

	// ----------------------------------------
	//              media: delete
	// ----------------------------------------
	{
		displayName: 'Media ID',
		name: 'mediaId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: show(['delete']) },
		description:
			'From the Upload operation. Media used in published posts is not affected. Media library files from the PostPlanify dashboard cannot be deleted here.',
	},

	// ----------------------------------------
	//              media: getAll
	// ----------------------------------------
	workspaceField(
		show(['getAll']),
		false,
		"Also return this workspace's media library. Leave empty for your API uploads only.",
	),
	...returnAllFields(show(['getAll']), 500),
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		options: [
			{ name: 'All', value: '' },
			{ name: 'Image', value: 'image' },
			{ name: 'Video', value: 'video' },
		],
		default: '',
		displayOptions: { show: show(['getAll']) },
		description: 'Filter the workspace media library by type',
	},
];
