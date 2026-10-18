import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

import {
	compact,
	postPlanifyApiList,
	postPlanifyApiPaginate,
	postPlanifyApiRequest,
	socialAccountLabel,
} from './GenericFunctions';
import { uploadBinary, uploadUrl } from './PostFunctions';

const sum = (rows: IDataObject[], key: string) =>
	rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);

const limitResults = (results: IDataObject[], returnAll: boolean, limit: number) =>
	returnAll ? results : results.slice(0, limit);

// ----------------------------------------
//                 Media
// ----------------------------------------

export async function uploadMedia(this: IExecuteFunctions, itemIndex: number): Promise<IDataObject> {
	const source = this.getNodeParameter('source', itemIndex) as string;
	if (source === 'url') {
		const url = this.getNodeParameter('url', itemIndex) as string;
		const filename = this.getNodeParameter('filename', itemIndex, '') as string;
		return await uploadUrl.call(this, url, filename || undefined);
	}
	const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex) as string;
	return await uploadBinary.call(this, itemIndex, binaryPropertyName);
}

export async function deleteMedia(this: IExecuteFunctions, itemIndex: number): Promise<IDataObject> {
	const mediaId = this.getNodeParameter('mediaId', itemIndex) as string;
	await postPlanifyApiRequest.call(this, 'DELETE', `/media/${encodeURIComponent(mediaId)}`);
	return { id: mediaId, deleted: true };
}

// The API returns the workspace library page followed by every API upload on
// each page, so pages are merged by id. Uploads are not paginated.
export async function getManyMedia(this: IExecuteFunctions, itemIndex: number): Promise<IDataObject[]> {
	const returnAll = this.getNodeParameter('returnAll', itemIndex) as boolean;
	const limit = returnAll ? Infinity : (this.getNodeParameter('limit', itemIndex) as number);
	const workspaceId = this.getNodeParameter('workspaceId', itemIndex, '') as string;
	const type = this.getNodeParameter('type', itemIndex, '') as string;
	const pageSize = 100;

	const byId = new Map<string, IDataObject>();
	for (let page = 1; ; page++) {
		const media = await postPlanifyApiList.call(
			this,
			'/media',
			compact({ workspaceId, type, page: workspaceId ? page : undefined, pageSize: workspaceId ? pageSize : undefined }),
		);
		const libraryCount = media.filter((item) => item.source === 'library').length;
		for (const item of media) byId.set(String(item.id), item);
		if (!workspaceId || libraryCount < pageSize || byId.size >= limit) break;
	}
	return limitResults([...byId.values()], returnAll, limit);
}

// ----------------------------------------
//                Comment
// ----------------------------------------

export async function getManyComments(this: IExecuteFunctions, itemIndex: number): Promise<IDataObject[]> {
	const returnAll = this.getNodeParameter('returnAll', itemIndex) as boolean;
	const limit = returnAll ? undefined : (this.getNodeParameter('limit', itemIndex) as number);
	const filters = this.getNodeParameter('filters', itemIndex, {}) as IDataObject;
	const qs = compact({
		workspaceId: this.getNodeParameter('workspaceId', itemIndex) as string,
		socialAccountId: this.getNodeParameter('socialAccountId', itemIndex, '') as string,
		platform: filters.platform,
		unreadOnly: filters.unreadOnly ? 'true' : undefined,
	});
	const comments = await postPlanifyApiPaginate.call(this, '/comments', qs, 50, limit);
	return this.getNodeParameter('simplify', itemIndex, true) ? comments.map(simplifyComment) : comments;
}

/** The 10 most useful comment fields, flattened. */
function simplifyComment(comment: IDataObject): IDataObject {
	const account = (comment.socialAccount as IDataObject | undefined) ?? {};
	const post = (comment.post as IDataObject | undefined) ?? {};
	return compact({
		id: comment.id,
		text: comment.text,
		username: comment.username,
		timestamp: comment.timestamp,
		platform: account.platform,
		accountName: account.accountName,
		rating: comment.rating,
		replyCount: comment.replyCount,
		brandReplied: comment.brandReplied,
		postUrl: post.permalink,
	});
}

export async function getCommentReplies(this: IExecuteFunctions, itemIndex: number): Promise<IDataObject[]> {
	const commentId = this.getNodeParameter('commentId', itemIndex) as string;
	return await postPlanifyApiList.call(this, `/comments/${encodeURIComponent(commentId)}/replies`);
}

export async function replyToComment(this: IExecuteFunctions, itemIndex: number): Promise<IDataObject> {
	const commentId = this.getNodeParameter('commentId', itemIndex) as string;
	const message = this.getNodeParameter('message', itemIndex) as string;
	const response = await postPlanifyApiRequest.call(
		this,
		'POST',
		`/comments/${encodeURIComponent(commentId)}/reply`,
		{ message },
	);
	return { ...(response.data as IDataObject), message };
}

// ----------------------------------------
//          Workspace / Social Account
// ----------------------------------------

export async function getWorkspace(this: IExecuteFunctions, itemIndex: number): Promise<IDataObject> {
	const workspaceId = this.getNodeParameter('workspaceId', itemIndex) as string;
	const response = await postPlanifyApiRequest.call(this, 'GET', `/workspaces/${encodeURIComponent(workspaceId)}`);
	return response.data as IDataObject;
}

export async function getManyWorkspaces(this: IExecuteFunctions): Promise<IDataObject[]> {
	return await postPlanifyApiList.call(this, '/workspaces');
}

export async function getSocialAccount(this: IExecuteFunctions, itemIndex: number): Promise<IDataObject> {
	const socialAccountId = this.getNodeParameter('socialAccountId', itemIndex) as string;
	const response = await postPlanifyApiRequest.call(
		this,
		'GET',
		`/social-accounts/${encodeURIComponent(socialAccountId)}`,
	);
	const account = response.data as IDataObject;
	return { ...account, label: socialAccountLabel(account) };
}

// The API lists every account the user can reach, so it is filtered here.
export async function getManySocialAccounts(this: IExecuteFunctions, itemIndex: number): Promise<IDataObject[]> {
	const workspaceId = this.getNodeParameter('workspaceId', itemIndex) as string;
	const filters = this.getNodeParameter('filters', itemIndex, {}) as IDataObject;
	const name = String(filters.name ?? '').trim().toLowerCase().replace(/^@/, '');
	const accounts = await postPlanifyApiList.call(this, '/social-accounts');
	return accounts
		.filter((account) => account.workspaceId === workspaceId)
		.filter((account) => !filters.platform || account.platform === filters.platform)
		.filter(
			(account) =>
				!name ||
				[account.accountName, account.customLabel].some((value) =>
					String(value ?? '').toLowerCase().includes(name),
				),
		)
		.map((account) => ({ ...account, label: socialAccountLabel(account) }));
}

// ----------------------------------------
//                Analytics
// ----------------------------------------

export async function getWorkspaceOverview(this: IExecuteFunctions, itemIndex: number): Promise<IDataObject> {
	const workspaceId = this.getNodeParameter('workspaceId', itemIndex) as string;
	const response = await postPlanifyApiRequest.call(
		this,
		'GET',
		`/analytics/${encodeURIComponent(workspaceId)}/overview`,
	);
	const data = response.data as IDataObject;
	const accounts = (data.accounts as IDataObject[] | undefined) ?? [];
	return {
		workspaceId,
		totalViews: sum(accounts, 'views'),
		totalEngagement: sum(accounts, 'engagement'),
		totalFollowers: sum(accounts, 'currentFollowers'),
		totalPosts: sum(accounts, 'postCount'),
		...data,
	};
}

export async function getAccountAnalytics(this: IExecuteFunctions, itemIndex: number): Promise<IDataObject> {
	const workspaceId = this.getNodeParameter('workspaceId', itemIndex) as string;
	const socialAccountId = this.getNodeParameter('socialAccountId', itemIndex) as string;
	const response = await postPlanifyApiRequest.call(
		this,
		'GET',
		`/analytics/${encodeURIComponent(workspaceId)}/${encodeURIComponent(socialAccountId)}`,
	);
	return { socialAccountId, ...(response.data as IDataObject) };
}

export async function getAccountTrends(this: IExecuteFunctions, itemIndex: number): Promise<IDataObject> {
	const workspaceId = this.getNodeParameter('workspaceId', itemIndex) as string;
	const socialAccountId = this.getNodeParameter('socialAccountId', itemIndex) as string;
	const days = this.getNodeParameter('days', itemIndex, 30) as number;
	const response = await postPlanifyApiRequest.call(
		this,
		'GET',
		`/analytics/${encodeURIComponent(workspaceId)}/${encodeURIComponent(socialAccountId)}/trends`,
		undefined,
		{ days },
	);
	const data = response.data as IDataObject;
	const daily = (data.dailyMetrics as IDataObject[] | undefined) ?? [];
	const snapshots = (data.accountSnapshots as IDataObject[] | undefined) ?? [];
	const latest = snapshots.length ? snapshots[snapshots.length - 1] : undefined;
	return {
		socialAccountId,
		days,
		totalViews: sum(daily, 'totalViews'),
		totalLikes: sum(daily, 'totalLikes'),
		totalComments: sum(daily, 'totalComments'),
		totalShares: sum(daily, 'totalShares'),
		totalEngagement: sum(daily, 'totalEngagement'),
		currentFollowers: latest?.followersCount ?? null,
		...data,
	};
}
