import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { compact, postPlanifyApiPaginate, postPlanifyApiRequest, toIsoDate, toList } from './GenericFunctions';

// When no time is given the post is scheduled this far ahead, which is
// effectively "publish now" (the API only accepts future times).
const DEFAULT_DELAY_MS = 5 * 60 * 1000;

const hasValues = (object: IDataObject) => Object.keys(object).length > 0;

/** Uploads one binary field from the input item and returns the media record. */
export async function uploadBinary(
	this: IExecuteFunctions,
	itemIndex: number,
	propertyName: string,
): Promise<IDataObject> {
	const binaryData = this.helpers.assertBinaryData(itemIndex, propertyName);
	const buffer = await this.helpers.getBinaryDataBuffer(itemIndex, propertyName);
	const form = new FormData();
	form.append(
		'file',
		new Blob([new Uint8Array(buffer)], { type: binaryData.mimeType }),
		binaryData.fileName ?? 'upload',
	);
	const response = await postPlanifyApiRequest.call(this, 'POST', '/media/upload', form);
	return response.data as IDataObject;
}

/** Has PostPlanify download a public URL and returns the media record. */
export async function uploadUrl(this: IExecuteFunctions, url: string, filename?: string): Promise<IDataObject> {
	const response = await postPlanifyApiRequest.call(this, 'POST', '/media/from-url', compact({ url, filename }));
	return response.data as IDataObject;
}

/** Uploads every file in the Media collection, in order, and returns their media ids. */
export async function collectMediaIds(
	this: IExecuteFunctions,
	itemIndex: number,
	media: IDataObject,
): Promise<string[]> {
	const ids: string[] = [];
	// Binary fields that aren't on this item are skipped, so the default "data"
	// doesn't break posts that only use URLs or have no media.
	const items = this.getInputData();
	for (const name of toList(media.binaryPropertyNames)) {
		if (items[itemIndex].binary?.[name] === undefined) continue;
		ids.push(String((await uploadBinary.call(this, itemIndex, name)).id));
	}
	for (const url of toList(media.mediaUrls)) {
		ids.push(String((await uploadUrl.call(this, url)).id));
	}
	return [...ids, ...toList(media.mediaIds)];
}

/**
 * Returns the platform part of the API body, e.g. { youtubeParams: {...} }.
 * `forCreate` adds the defaults a new post needs; on update only settings the
 * user added are sent.
 */
export function buildPlatformParams(
	platform: string,
	settings: IDataObject,
	forCreate: boolean,
	timeZone: string,
): IDataObject {
	switch (platform) {
		case 'INSTAGRAM':
		case 'FACEBOOK':
			return forCreate && settings.isStory ? { isStory: true } : {};
		case 'YOUTUBE': {
			const youtubeParams = compact({
				title: settings.youtubeTitle,
				tags: settings.youtubeTags,
				categoryId: settings.youtubeCategoryId,
				selfDeclaredMadeForKids: settings.youtubeMadeForKids,
			});
			return hasValues(youtubeParams) ? { youtubeParams } : {};
		}
		case 'TIKTOK': {
			const tiktokParams = compact({
					// Always set on create (same as the publisher's default), so the post
					// has TikTok settings to edit later.
					privacyLevel: settings.tiktokPrivacyLevel || (forCreate ? 'PUBLIC_TO_EVERYONE' : undefined),
					disableComment: settings.tiktokDisableComment,
					disableDuet: settings.tiktokDisableDuet,
					disableStitch: settings.tiktokDisableStitch,
					photosPostTitle: settings.tiktokPhotosTitle,
					autoAddMusic: settings.tiktokAutoAddMusic,
					isCommercialContent: settings.tiktokIsCommercialContent,
					isYourBrand: settings.tiktokIsYourBrand,
					isBrandedContent: settings.tiktokIsBrandedContent,
			});
			return hasValues(tiktokParams) ? { tiktokParams } : {};
		}
		case 'PINTEREST': {
			const pinterestParams = compact({
				boardId: settings.pinterestBoardId,
				title: settings.pinterestTitle,
				link: settings.pinterestLink,
				altText: settings.pinterestAltText,
			});
			return hasValues(pinterestParams) ? { pinterestParams } : {};
		}
		case 'GOOGLE_BUSINESS': {
			const googleBusinessParams = compact({
					topicType: settings.gbpTopicType || (forCreate ? 'STANDARD' : undefined),
					eventTitle: settings.gbpEventTitle,
					startDate: toIsoDate(settings.gbpStartDate, timeZone),
					endDate: toIsoDate(settings.gbpEndDate, timeZone),
					actionType: settings.gbpActionType,
					actionUrl: settings.gbpActionUrl,
					couponCode: settings.gbpCouponCode,
					redeemOnlineUrl: settings.gbpRedeemOnlineUrl,
					termsConditions: settings.gbpTerms,
			});
			return hasValues(googleBusinessParams) ? { googleBusinessParams } : {};
		}
		case 'X':
			return compact({
				xCommunityId: settings.xCommunityId,
				// The API stores tagged users as one comma-separated string.
				xTaggedUsers: toList(settings.xTaggedUsers).join(','),
			});
		default:
			return {};
	}
}

export async function createPost(this: IExecuteFunctions, itemIndex: number): Promise<IDataObject> {
	const workspaceId = this.getNodeParameter('workspaceId', itemIndex) as string;
	const socialAccountId = this.getNodeParameter('socialAccountId', itemIndex) as string;
	const caption = this.getNodeParameter('caption', itemIndex, '') as string;
	const scheduledAt = this.getNodeParameter('scheduledAt', itemIndex, '') as string;
	const media = this.getNodeParameter('media', itemIndex, {}) as IDataObject;
	const settings = this.getNodeParameter('platformSettings', itemIndex, {}) as IDataObject;
	const additionalFields = this.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;

	const account = (await postPlanifyApiRequest.call(
		this,
		'GET',
		`/social-accounts/${encodeURIComponent(socialAccountId)}`,
	)).data as IDataObject;
	const platform = String(account.platform);

	// Checked before uploading so a missing setting doesn't leave orphaned media.
	if (platform === 'YOUTUBE' && !settings.youtubeTitle) {
		throw new NodeOperationError(this.getNode(), 'YouTube posts need a title', {
			itemIndex,
			description: "Add 'YouTube Title' under 'Platform Settings'.",
		});
	}
	if (platform === 'PINTEREST' && !settings.pinterestBoardId) {
		throw new NodeOperationError(this.getNode(), 'Pinterest posts need a board', {
			itemIndex,
			description: "Add 'Pinterest Board' under 'Platform Settings'.",
		});
	}

	const mediaIds = await collectMediaIds.call(this, itemIndex, media);
	if (!caption && mediaIds.length === 0) {
		throw new NodeOperationError(this.getNode(), 'A post needs a caption, media, or both', {
			itemIndex,
			description: "Fill in 'Caption', or add files under 'Media'.",
		});
	}

	const shortenLinks = additionalFields.shortenLinks === true;
	const body = compact({
		workspaceId,
		socialAccountId,
		caption,
		scheduledAt: toIsoDate(scheduledAt, this.getTimezone()) ?? new Date(Date.now() + DEFAULT_DELAY_MS).toISOString(),
		mediaIds: mediaIds.length ? mediaIds : undefined,
		shortenLinks: shortenLinks || undefined,
		utmCampaign: shortenLinks ? additionalFields.utmCampaign : undefined,
		...buildPlatformParams(platform, settings, true, this.getTimezone()),
	});

	const response = await postPlanifyApiRequest.call(this, 'POST', '/posts', body);
	return response.data as IDataObject;
}

function getPostId(this: IExecuteFunctions, itemIndex: number): string {
	return this.getNodeParameter('postId', itemIndex, '', { extractValue: true }) as string;
}

async function fetchPost(this: IExecuteFunctions, postId: string): Promise<IDataObject> {
	const response = await postPlanifyApiRequest.call(this, 'GET', `/posts/${encodeURIComponent(postId)}`);
	return response.data as IDataObject;
}

/** The 10 most useful post fields, flattened. */
export function simplifyPost(post: IDataObject): IDataObject {
	const account = (post.socialAccount as IDataObject | undefined) ?? {};
	const medias = (post.medias as IDataObject[] | undefined) ?? [];
	return compact({
		id: post.id,
		status: post.status,
		platform: post.platform,
		accountName: account.customLabel || account.accountName,
		caption: post.caption,
		scheduledAt: post.scheduledAt,
		publishedAt: post.publishedAt,
		mediaUrls: medias.map((media) => media.url),
		workspaceId: post.workspaceId,
		metrics: post.metrics,
	});
}

export async function getPost(this: IExecuteFunctions, itemIndex: number): Promise<IDataObject> {
	const post = await fetchPost.call(this, getPostId.call(this, itemIndex));
	return this.getNodeParameter('simplify', itemIndex, true) ? simplifyPost(post) : post;
}

export async function getManyPosts(this: IExecuteFunctions, itemIndex: number): Promise<IDataObject[]> {
	const returnAll = this.getNodeParameter('returnAll', itemIndex) as boolean;
	const limit = returnAll ? undefined : (this.getNodeParameter('limit', itemIndex) as number);
	const filters = this.getNodeParameter('filters', itemIndex, {}) as IDataObject;
	const qs = compact({
		workspaceId: this.getNodeParameter('workspaceId', itemIndex) as string,
		socialAccountId: this.getNodeParameter('socialAccountId', itemIndex, '') as string,
		status: filters.status,
		platform: filters.platform,
		from: toIsoDate(filters.from, this.getTimezone()),
		to: toIsoDate(filters.to, this.getTimezone()),
		includeMetrics: filters.includeMetrics ? 'true' : undefined,
	});
	const posts = await postPlanifyApiPaginate.call(this, '/posts', qs, 100, limit);
	return this.getNodeParameter('simplify', itemIndex, true) ? posts.map(simplifyPost) : posts;
}

// Only fields the user added are changed.
export async function updatePost(this: IExecuteFunctions, itemIndex: number): Promise<IDataObject> {
	const postId = getPostId.call(this, itemIndex);
	const updateFields = this.getNodeParameter('updateFields', itemIndex, {}) as IDataObject;
	const settings = this.getNodeParameter('platformSettings', itemIndex, {}) as IDataObject;

	// Platform settings are only looked up when some were added.
	const platformParams = hasValues(settings)
		? buildPlatformParams(
				String((await fetchPost.call(this, postId)).platform),
				settings,
				false,
				this.getTimezone(),
			)
		: {};

	const body = compact({
		caption: updateFields.caption,
		scheduledAt: toIsoDate(updateFields.scheduledAt, this.getTimezone()),
		shortenLinks: updateFields.shortenLinks,
		utmCampaign: updateFields.utmCampaign,
		...platformParams,
	});

	if (!hasValues(body)) {
		throw new NodeOperationError(this.getNode(), 'Add at least one field to change', {
			itemIndex,
			description: "Add a field under 'Update Fields', or a setting for the post's platform under 'Platform Settings'.",
		});
	}

	const response = await postPlanifyApiRequest.call(this, 'PATCH', `/posts/${encodeURIComponent(postId)}`, body);
	return response.data as IDataObject;
}

export async function cancelPost(this: IExecuteFunctions, itemIndex: number): Promise<IDataObject> {
	const postId = getPostId.call(this, itemIndex);
	const response = await postPlanifyApiRequest.call(this, 'POST', `/posts/${encodeURIComponent(postId)}/cancel`);
	return response.data as IDataObject;
}

export async function deletePost(this: IExecuteFunctions, itemIndex: number): Promise<IDataObject> {
	const postId = getPostId.call(this, itemIndex);
	await postPlanifyApiRequest.call(this, 'DELETE', `/posts/${encodeURIComponent(postId)}`);
	return { id: postId, deleted: true };
}
