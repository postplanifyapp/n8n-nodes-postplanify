import type {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { INBOX_PLATFORM_OPTIONS, PLATFORM_OPTIONS } from '../PostPlanify/descriptions/shared';
import { compact, postPlanifyApiList, postPlanifyApiPaginate } from '../PostPlanify/GenericFunctions';
import { getSocialAccounts, getWorkspaces } from '../PostPlanify/LoadOptions';

// IDs already emitted are kept in the workflow's static data so each post or
// comment fires once. Capped so the stored list can't grow forever.
const MAX_SEEN_IDS = 2000;

// The API sorts posts by scheduled time, newest first, so a post scheduled
// sooner than older queued posts can sit past page 1. Upcoming scheduled posts
// are paged through up to this many.
const MAX_SCHEDULED_POSTS = 500;

export class PostPlanifyTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PostPlanify Trigger',
		name: 'postPlanifyTrigger',
		icon: { light: 'file:../../icons/postplanify.svg', dark: 'file:../../icons/postplanify.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Starts the workflow when a post is scheduled or published, or a new comment arrives',
		defaults: {
			name: 'PostPlanify Trigger',
		},
		polling: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'postPlanifyApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'New Comment',
						value: 'newComment',
						description:
							'Someone comments on your Facebook, Instagram or LinkedIn posts, or leaves a Google Business review',
					},
					{
						name: 'New Published Post',
						value: 'newPublishedPost',
						description: 'A post is published to a social network',
					},
					{
						name: 'New Scheduled Post',
						value: 'newScheduledPost',
						description: 'A post is scheduled in PostPlanify',
					},
				],
				default: 'newScheduledPost',
			},
			{
				displayName: 'Workspace Name or ID',
				name: 'workspaceId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getWorkspaces' },
				required: true,
				default: '',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
			{
				displayName: 'Social Account Name or ID',
				name: 'socialAccountId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getSocialAccounts', loadOptionsDependsOn: ['workspaceId'] },
				default: '',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				hint: 'Only this account. Leave empty for all accounts in the workspace.',
			},
			{
				displayName: 'Platform',
				name: 'platform',
				type: 'options',
				options: [{ name: 'All Platforms', value: '' }, ...PLATFORM_OPTIONS],
				default: '',
				displayOptions: { show: { event: ['newScheduledPost', 'newPublishedPost'] } },
			},
			{
				displayName: 'Platform',
				name: 'commentPlatform',
				type: 'options',
				options: [{ name: 'All Platforms', value: '' }, ...INBOX_PLATFORM_OPTIONS],
				default: '',
				displayOptions: { show: { event: ['newComment'] } },
			},
		],
	};

	methods = {
		loadOptions: { getWorkspaces, getSocialAccounts },
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const event = this.getNodeParameter('event') as string;
		const workspaceId = this.getNodeParameter('workspaceId') as string;
		const socialAccountId = this.getNodeParameter('socialAccountId', '') as string;

		let records: IDataObject[];
		if (event === 'newComment') {
			const platform = this.getNodeParameter('commentPlatform', '') as string;
			records = await postPlanifyApiList.call(
				this,
				'/comments',
				compact({ workspaceId, socialAccountId, platform, limit: 50 }),
			);
		} else {
			const platform = this.getNodeParameter('platform', '') as string;
			const scheduled = event === 'newScheduledPost';
			const qs = compact({
				workspaceId,
				socialAccountId,
				platform,
				status: scheduled ? 'SCHEDULED' : 'PUBLISHED',
				from: scheduled ? new Date().toISOString() : undefined,
			});
			records = await postPlanifyApiPaginate.call(this, '/posts', qs, 100, scheduled ? MAX_SCHEDULED_POSTS : 100);
		}

		// Newest first by creation time, so new items come out in a stable order
		// and a manual test shows the most recent one.
		const createdAt = (record: IDataObject) =>
			new Date(String(record.createdAt ?? record.timestamp ?? 0)).getTime() || 0;
		records.sort((a, b) => createdAt(b) - createdAt(a));

		if (this.getMode() === 'manual') {
			return records.length ? [this.helpers.returnJsonArray(records.slice(0, 1))] : null;
		}

		const staticData = this.getWorkflowStaticData('node') as { seenIds?: string[] };
		const ids = records.map((record) => String(record.id));

		// First run after activation: remember what already exists so the workflow
		// only fires for items that arrive from now on.
		if (staticData.seenIds === undefined) {
			staticData.seenIds = ids.slice(0, MAX_SEEN_IDS);
			return null;
		}

		const seen = new Set(staticData.seenIds);
		const fresh = records.filter((record) => !seen.has(String(record.id)));
		staticData.seenIds = [...new Set([...ids, ...staticData.seenIds])].slice(0, MAX_SEEN_IDS);

		return fresh.length ? [this.helpers.returnJsonArray(fresh)] : null;
	}
}
