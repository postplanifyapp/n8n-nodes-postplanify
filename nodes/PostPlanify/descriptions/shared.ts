import type { INodeProperties } from 'n8n-workflow';

type Show = Record<string, string[]>;

export const PLATFORM_OPTIONS = [
	{ name: 'Bluesky', value: 'BLUESKY' },
	{ name: 'Facebook', value: 'FACEBOOK' },
	{ name: 'Google Business', value: 'GOOGLE_BUSINESS' },
	{ name: 'Instagram', value: 'INSTAGRAM' },
	{ name: 'LinkedIn', value: 'LINKEDIN' },
	{ name: 'Pinterest', value: 'PINTEREST' },
	{ name: 'Threads', value: 'THREADS' },
	{ name: 'TikTok', value: 'TIKTOK' },
	{ name: 'X', value: 'X' },
	{ name: 'YouTube', value: 'YOUTUBE' },
];

// Platforms with a comment inbox in PostPlanify.
export const INBOX_PLATFORM_OPTIONS = [
	{ name: 'Facebook', value: 'FACEBOOK' },
	{ name: 'Google Business', value: 'GOOGLE_BUSINESS' },
	{ name: 'Instagram', value: 'INSTAGRAM' },
	{ name: 'LinkedIn', value: 'LINKEDIN' },
];

export function workspaceField(show: Show, required = true, description?: string): INodeProperties {
	return {
		displayName: 'Workspace Name or ID',
		name: 'workspaceId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getWorkspaces' },
		required,
		default: '',
		displayOptions: { show },
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		hint: description ?? 'The PostPlanify workspace',
	};
}

export function socialAccountField(show: Show, required = true, description?: string): INodeProperties {
	return {
		displayName: 'Social Account Name or ID',
		name: 'socialAccountId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getSocialAccounts', loadOptionsDependsOn: ['workspaceId'] },
		required,
		default: '',
		displayOptions: { show },
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		hint: description ?? 'A social account connected in the selected workspace',
	};
}

export function simplifyField(show: Show): INodeProperties {
	return {
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		displayOptions: { show },
		description: 'Whether to return a simplified version of the response instead of the raw data',
	};
}

export function returnAllFields(show: Show, maxLimit: number): INodeProperties[] {
	return [
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			displayOptions: { show },
			description: 'Whether to return all results or only up to a given limit',
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			typeOptions: { minValue: 1, maxValue: maxLimit },
			default: 50,
			displayOptions: { show: { ...show, returnAll: [false] } },
			description: 'Max number of results to return',
		},
	];
}

/**
 * Platform-specific settings for Create and Update. `forCreate` adds the
 * settings the API only accepts when a post is created (Story).
 */
export function platformSettingsField(show: Show, forCreate: boolean): INodeProperties {
	const options: INodeProperties[] = [
		{
			displayName: 'Button (Google Business)',
			name: 'gbpActionType',
			type: 'options',
			options: [
				{ name: 'Book', value: 'BOOK' },
				{ name: 'Call', value: 'CALL' },
				{ name: 'Learn More', value: 'LEARN_MORE' },
				{ name: 'Order', value: 'ORDER' },
				{ name: 'Shop', value: 'SHOP' },
				{ name: 'Sign Up', value: 'SIGN_UP' },
			],
			default: 'LEARN_MORE',
			description: 'Call-to-action button. Not available for offers.',
		},
		{
			displayName: 'Button Link (Google Business)',
			name: 'gbpActionUrl',
			type: 'string',
			default: '',
			description: 'Required for every button except Call',
		},
		{
			displayName: 'Coupon Code (Google Business Offers)',
			name: 'gbpCouponCode',
			type: 'string',
			default: '',
			description: 'Max 58 characters',
		},
		{
			displayName: 'Destination Link (Pinterest)',
			name: 'pinterestLink',
			type: 'string',
			default: '',
			description: 'Where the Pin links to',
		},
		{
			displayName: 'Disable Comments (TikTok)',
			name: 'tiktokDisableComment',
			type: 'boolean',
			default: false,
			description: 'Whether to turn off comments on the TikTok post',
		},
		{
			displayName: 'Disable Duet (TikTok)',
			name: 'tiktokDisableDuet',
			type: 'boolean',
			default: false,
			description: 'Whether to turn off Duet on the TikTok post',
		},
		{
			displayName: 'Disable Stitch (TikTok)',
			name: 'tiktokDisableStitch',
			type: 'boolean',
			default: false,
			description: 'Whether to turn off Stitch on the TikTok post',
		},
		{
			displayName: 'End Date (Google Business Events and Offers)',
			name: 'gbpEndDate',
			type: 'dateTime',
			default: '',
		},
		{
			displayName: 'Event or Offer Title (Google Business)',
			name: 'gbpEventTitle',
			type: 'string',
			default: '',
			description: 'Max 58 characters. Required for events and offers.',
		},
		{
			displayName: 'Made for Kids (YouTube)',
			name: 'youtubeMadeForKids',
			type: 'boolean',
			default: false,
			description: 'Whether the video is made for kids',
		},
		{
			displayName: 'Photo Post Title (TikTok)',
			name: 'tiktokPhotosTitle',
			type: 'string',
			default: '',
			description: 'Title for TikTok photo (carousel) posts',
		},
		{
			displayName: 'Pin Alt Text (Pinterest)',
			name: 'pinterestAltText',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Pin Title (Pinterest)',
			name: 'pinterestTitle',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Pinterest Board Name or ID',
			name: 'pinterestBoardId',
			type: 'options',
			typeOptions: {
				loadOptionsMethod: 'getPinterestBoards',
				loadOptionsDependsOn: ['socialAccountId', 'postId.value'],
			},
			default: '',
			description:
				'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		},
		{
			displayName: 'Post Type (Google Business)',
			name: 'gbpTopicType',
			type: 'options',
			options: [
				{ name: 'Update', value: 'STANDARD' },
				{ name: 'Event', value: 'EVENT' },
				{ name: 'Offer', value: 'OFFER' },
			],
			default: 'STANDARD',
			description: 'Events and offers need a title and start and end dates',
		},
		{
			displayName: 'Privacy (TikTok)',
			name: 'tiktokPrivacyLevel',
			type: 'options',
			options: [
				{ name: 'Everyone', value: 'PUBLIC_TO_EVERYONE' },
				{ name: 'Followers', value: 'FOLLOWER_OF_CREATOR' },
				{ name: 'Friends', value: 'MUTUAL_FOLLOW_FRIENDS' },
				{ name: 'Only Me', value: 'SELF_ONLY' },
			],
			default: 'PUBLIC_TO_EVERYONE',
			description: 'Who can see the TikTok post',
		},
		{
			displayName: 'Redeem Online Link (Google Business Offers)',
			name: 'gbpRedeemOnlineUrl',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Start Date (Google Business Events and Offers)',
			name: 'gbpStartDate',
			type: 'dateTime',
			default: '',
		},
		{
			displayName: 'Tag Users in Media (X)',
			name: 'xTaggedUsers',
			type: 'string',
			default: '',
			placeholder: 'e.g. jack, @acme',
			description: 'Comma-separated X usernames to tag in the attached media',
		},
		{
			displayName: 'Terms and Conditions (Google Business Offers)',
			name: 'gbpTerms',
			type: 'string',
			default: '',
		},
		{
			displayName: 'TikTok Auto Add Music',
			name: 'tiktokAutoAddMusic',
			type: 'boolean',
			default: false,
			description: 'Whether TikTok adds music to photo posts',
		},
		{
			displayName: 'TikTok Branded Content',
			name: 'tiktokIsBrandedContent',
			type: 'boolean',
			default: false,
			description: 'Whether the post is a paid partnership',
		},
		{
			displayName: 'TikTok Commercial Content',
			name: 'tiktokIsCommercialContent',
			type: 'boolean',
			default: false,
			description: 'Whether the post promotes a brand, product or service',
		},
		{
			displayName: 'TikTok Promotes Your Own Brand',
			name: 'tiktokIsYourBrand',
			type: 'boolean',
			default: false,
			description: 'Whether the post promotes your own business',
		},
		{
			displayName: 'X Community ID',
			name: 'xCommunityId',
			type: 'string',
			default: '',
			description: 'Post into an X Community',
		},
		{
			displayName: 'YouTube Category ID',
			name: 'youtubeCategoryId',
			type: 'string',
			default: '',
			placeholder: 'e.g. 22',
			description: 'Numeric YouTube category, e.g. 22 (People & Blogs)',
		},
		{
			displayName: 'YouTube Tags',
			name: 'youtubeTags',
			type: 'string',
			default: '',
			placeholder: 'e.g. coffee, recipes',
			description: 'Comma-separated video tags',
		},
		{
			displayName: 'YouTube Title',
			name: 'youtubeTitle',
			type: 'string',
			default: '',
			description: `Video title, max 100 characters.${forCreate ? ' Required for YouTube.' : ''}`,
		},
	];

	if (forCreate) {
		options.push({
			displayName: 'Post as Story (Instagram, Facebook)',
			name: 'isStory',
			type: 'boolean',
			default: false,
			description: 'Whether to post as a Story. Stories need exactly one image or video.',
		});
		options.sort((a, b) => a.displayName.localeCompare(b.displayName));
	}

	return {
		displayName: 'Platform Settings',
		name: 'platformSettings',
		type: 'collection',
		placeholder: 'Add Setting',
		default: {},
		displayOptions: { show },
		description: forCreate
			? "Settings for the account's platform. Only settings for that platform are sent, so one node can post to any account."
			: "Settings for the post's platform. Only settings you add are changed.",
		options,
	};
}
