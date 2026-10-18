import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IPollFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

// Public API docs: https://postplanify.com/docs
export const BASE_URL = 'https://api.postplanify.com/api/v1';

export const PLATFORM_NAMES: Record<string, string> = {
	FACEBOOK: 'Facebook',
	INSTAGRAM: 'Instagram',
	X: 'X',
	LINKEDIN: 'LinkedIn',
	TIKTOK: 'TikTok',
	YOUTUBE: 'YouTube',
	THREADS: 'Threads',
	BLUESKY: 'Bluesky',
	PINTEREST: 'Pinterest',
	GOOGLE_BUSINESS: 'Google Business',
};

type Context = IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions;

interface ApiErrorBody {
	ok?: boolean;
	error?: { code?: string; message?: string };
}

/**
 * Calls the PostPlanify API and returns the `data` part of the response.
 * Every response is { ok, data } (lists add { pagination }); errors are
 * { ok: false, error: { code, message } } and are turned into a NodeApiError
 * with the API's own message instead of a generic "status 400".
 */
export async function postPlanifyApiRequest(
	this: Context,
	method: IHttpRequestMethods,
	path: string,
	body?: IDataObject | FormData,
	qs?: IDataObject,
): Promise<IDataObject> {
	const options: IHttpRequestOptions = {
		method,
		url: `${BASE_URL}${path}`,
		qs,
		json: !(body instanceof FormData),
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
	};
	if (body !== undefined) options.body = body;

	const response = (await this.helpers.httpRequestWithAuthentication.call(
		this,
		'postPlanifyApi',
		options,
	)) as { statusCode: number; body: unknown };

	const responseBody = (response.body ?? {}) as IDataObject & ApiErrorBody;

	if (response.statusCode >= 400) {
		const code = responseBody.error?.code;
		const message = responseBody.error?.message ?? `PostPlanify returned status ${response.statusCode}`;
		let description = code ? `PostPlanify code: ${code}` : undefined;
		if (response.statusCode === 401) {
			description = 'Your PostPlanify API key is invalid or was revoked. Update the credential with a new key.';
		}
		throw new NodeApiError(this.getNode(), responseBody as JsonObject, {
			message,
			description,
			httpCode: String(response.statusCode),
		});
	}

	return responseBody;
}

/** GETs a list endpoint and returns its array. */
export async function postPlanifyApiList(
	this: Context,
	path: string,
	qs?: IDataObject,
): Promise<IDataObject[]> {
	const response = await postPlanifyApiRequest.call(this, 'GET', path, undefined, qs);
	return Array.isArray(response.data) ? (response.data as IDataObject[]) : [];
}

/**
 * Pages through a list endpoint that takes page/limit and returns
 * { pagination: { has_more } }. Stops at `max` results (undefined = all).
 */
export async function postPlanifyApiPaginate(
	this: Context,
	path: string,
	qs: IDataObject,
	pageSize: number,
	max?: number,
): Promise<IDataObject[]> {
	const results: IDataObject[] = [];
	// The page size stays the same on every request so page offsets line up;
	// extra results are trimmed at the end.
	const limit = max === undefined ? pageSize : Math.min(pageSize, max);
	for (let page = 1; ; page++) {
		const response = await postPlanifyApiRequest.call(this, 'GET', path, undefined, { ...qs, page, limit });
		const data = Array.isArray(response.data) ? (response.data as IDataObject[]) : [];
		results.push(...data);
		const hasMore = (response.pagination as IDataObject | undefined)?.has_more === true;
		if (!hasMore || data.length === 0 || (max !== undefined && results.length >= max)) break;
	}
	return max === undefined ? results : results.slice(0, max);
}

/** Drops undefined, null and empty-string values so blank optional fields aren't sent. */
export function compact(object: IDataObject): IDataObject {
	return Object.fromEntries(
		Object.entries(object).filter(([, value]) => value !== undefined && value !== null && value !== ''),
	);
}

/** Splits a comma-separated string (or array) into trimmed, non-empty values. */
export function toList(value: unknown): string[] {
	if (value === undefined || value === null || value === '') return [];
	const items = Array.isArray(value) ? value : String(value).split(',');
	return items.map((item) => String(item).trim()).filter(Boolean);
}

// Offset of `timeZone` from UTC at the given instant, in milliseconds.
function timeZoneOffset(instant: number, timeZone: string): number {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone,
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	}).formatToParts(new Date(instant));
	const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
	const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
	return asUtc - Math.floor(instant / 1000) * 1000;
}

const WALL_CLOCK = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?)?$/;

/**
 * Converts a date value from an n8n date field to ISO 8601 (UTC).
 * The date picker gives a wall-clock time without an offset, which means the
 * workflow's time zone, not the server's (n8n Cloud servers run on UTC).
 * Values with an explicit offset or Z are kept as given.
 */
export function toIsoDate(value: unknown, timeZone: string): string | undefined {
	if (!value) return undefined;
	const text = String(value).trim();
	const match = WALL_CLOCK.exec(text);
	if (match) {
		const [, year, month, day, hour = '0', minute = '0', second = '0'] = match;
		const wallAsUtc = Date.UTC(+year, +month - 1, +day, +hour, +minute, +second);
		// Two passes so times next to a daylight saving change use the right offset.
		let instant = wallAsUtc - timeZoneOffset(wallAsUtc, timeZone);
		instant = wallAsUtc - timeZoneOffset(instant, timeZone);
		return new Date(instant).toISOString();
	}
	const date = new Date(text);
	return Number.isNaN(date.getTime()) ? text : date.toISOString();
}

/** Social account label for dropdowns, e.g. "Instagram: acmecoffee". */
export function socialAccountLabel(account: IDataObject): string {
	const platform = String(account.platform ?? '');
	return `${PLATFORM_NAMES[platform] ?? platform}: ${String(account.customLabel || account.accountName || account.id)}`;
}
