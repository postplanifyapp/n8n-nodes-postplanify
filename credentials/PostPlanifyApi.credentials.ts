import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class PostPlanifyApi implements ICredentialType {
	name = 'postPlanifyApi';

	displayName = 'PostPlanify API';

	icon: Icon = { light: 'file:../icons/postplanify.svg', dark: 'file:../icons/postplanify.dark.svg' };

	documentationUrl = 'https://github.com/postplanifyapp/n8n-nodes-postplanify?tab=readme-ov-file#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description:
				'Create an API key in PostPlanify under Dashboard > API Keys (https://postplanify.com/dashboard/api-keys). It starts with sk_live_. API access needs a plan that includes it.',
		},
	];

	// Sent as "Authorization: Bearer sk_live_..." on every request.
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.postplanify.com/api/v1',
			url: '/me',
		},
	};
}
