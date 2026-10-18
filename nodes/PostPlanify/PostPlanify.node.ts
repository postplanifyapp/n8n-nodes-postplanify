import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeListSearchResult,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { analyticsFields, analyticsOperations } from './descriptions/AnalyticsDescription';
import { commentFields, commentOperations } from './descriptions/CommentDescription';
import {
	socialAccountFields,
	socialAccountOperations,
	workspaceFields,
	workspaceOperations,
} from './descriptions/AccountDescription';
import { mediaFields, mediaOperations } from './descriptions/MediaDescription';
import { postFields, postOperations } from './descriptions/PostDescription';
import { PLATFORM_NAMES, postPlanifyApiList, postPlanifyApiRequest } from './GenericFunctions';
import { getSocialAccounts, getWorkspaces } from './LoadOptions';
import { cancelPost, createPost, deletePost, getManyPosts, getPost, updatePost } from './PostFunctions';
import {
	deleteMedia,
	getAccountAnalytics,
	getAccountTrends,
	getCommentReplies,
	getManyComments,
	getManyMedia,
	getManySocialAccounts,
	getManyWorkspaces,
	getSocialAccount,
	getWorkspace,
	getWorkspaceOverview,
	replyToComment,
	uploadMedia,
} from './ResourceFunctions';

type Operation = (this: IExecuteFunctions, itemIndex: number) => Promise<IDataObject | IDataObject[]>;

const OPERATIONS: Record<string, Record<string, Operation>> = {
	post: {
		create: createPost,
		get: getPost,
		getAll: getManyPosts,
		update: updatePost,
		cancel: cancelPost,
		delete: deletePost,
	},
	media: { upload: uploadMedia, getAll: getManyMedia, delete: deleteMedia },
	comment: { getAll: getManyComments, getReplies: getCommentReplies, reply: replyToComment },
	workspace: { get: getWorkspace, getAll: getManyWorkspaces },
	socialAccount: { get: getSocialAccount, getAll: getManySocialAccounts },
	analytics: { getOverview: getWorkspaceOverview, getAccount: getAccountAnalytics, getTrends: getAccountTrends },
};

export class PostPlanify implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PostPlanify',
		name: 'postPlanify',
		icon: { light: 'file:../../icons/postplanify.svg', dark: 'file:../../icons/postplanify.dark.svg' },
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Schedule social media posts, reply to comments and read analytics with PostPlanify',
		defaults: {
			name: 'PostPlanify',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'postPlanifyApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Analytics', value: 'analytics' },
					{ name: 'Comment', value: 'comment' },
					{ name: 'Media', value: 'media' },
					{ name: 'Post', value: 'post' },
					{ name: 'Social Account', value: 'socialAccount' },
					{ name: 'Workspace', value: 'workspace' },
				],
				default: 'post',
			},
			...postOperations,
			...postFields,
			...mediaOperations,
			...mediaFields,
			...commentOperations,
			...commentFields,
			...analyticsOperations,
			...analyticsFields,
			...socialAccountOperations,
			...socialAccountFields,
			...workspaceOperations,
			...workspaceFields,
		],
	};

	methods = {
		loadOptions: {
			getWorkspaces,
			getSocialAccounts,

			// Create picks the account directly; Update gets it from the post.
			async getPinterestBoards(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				let socialAccountId = this.getCurrentNodeParameter('socialAccountId') as string | undefined;
				if (!socialAccountId) {
					const postId = this.getCurrentNodeParameter('postId', { extractValue: true }) as string | undefined;
					if (!postId) return [];
					const post = await postPlanifyApiRequest.call(this, 'GET', `/posts/${encodeURIComponent(postId)}`);
					socialAccountId = ((post.data as IDataObject).socialAccount as IDataObject | undefined)?.id as
						| string
						| undefined;
				}
				if (!socialAccountId) return [];
				const boards = await postPlanifyApiList.call(
					this,
					`/social-accounts/${encodeURIComponent(socialAccountId)}/pinterest-boards`,
				);
				return boards.map((board) => ({ name: String(board.name), value: String(board.id) }));
			},
		},

		listSearch: {
			// Lists posts in the selected workspace. Update and Cancel only work on
			// scheduled posts, so only those are listed for them.
			async searchPosts(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
				const workspaceId = this.getCurrentNodeParameter('workspaceId') as string | undefined;
				if (!workspaceId) return { results: [] };
				const operation = this.getCurrentNodeParameter('operation') as string;
				const statuses = ['update', 'cancel'].includes(operation) ? ['SCHEDULED', 'RESCHEDULED'] : [undefined];

				const lists = await Promise.all(
					statuses.map((status) =>
						postPlanifyApiList.call(this, '/posts', { workspaceId, limit: 100, ...(status ? { status } : {}) }),
					),
				);
				const search = (filter ?? '').toLowerCase();
				const results = lists
					.flat()
					.filter((post) => !search || String(post.caption ?? '').toLowerCase().includes(search))
					.map((post) => {
						const when = post.scheduledAt
							? new Date(String(post.scheduledAt)).toISOString().slice(0, 16).replace('T', ' ') + ' UTC'
							: 'Unscheduled';
						const platform = PLATFORM_NAMES[String(post.platform)] ?? String(post.platform);
						const caption = String(post.caption || '(no caption)').replace(/\s+/g, ' ').slice(0, 50);
						return { name: `${when} · ${platform} · ${caption}`, value: String(post.id) };
					});
				return { results };
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				const run = OPERATIONS[resource]?.[operation];
				if (!run) {
					throw new NodeOperationError(
						this.getNode(),
						`The operation "${operation}" is not supported for "${resource}"`,
						{ itemIndex: i },
					);
				}

				const responseData = await run.call(this, i);
				// "Get Many" style operations return one n8n item per result.
				const results = Array.isArray(responseData) ? responseData : [responseData];
				for (const result of results) {
					returnData.push({ json: result, pairedItem: { item: i } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				// API and validation errors are already n8n errors; add the item index
				// so the UI points at the failing item. Anything else gets wrapped.
				if (error instanceof NodeApiError || error instanceof NodeOperationError) {
					const nodeError = error;
					nodeError.context.itemIndex = i;
					throw nodeError;
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
