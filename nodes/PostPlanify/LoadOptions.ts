import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { postPlanifyApiList, socialAccountLabel } from './GenericFunctions';

// Dropdown loaders shared by the PostPlanify node and the PostPlanify Trigger.

export async function getWorkspaces(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const workspaces = await postPlanifyApiList.call(this, '/workspaces');
	return workspaces.map((workspace) => ({
		name: String(workspace.name),
		value: String(workspace.id),
	}));
}

// The API lists every account the user can reach, so it is filtered to the
// workspace picked in the same node.
export async function getSocialAccounts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const workspaceId = this.getCurrentNodeParameter('workspaceId') as string | undefined;
	const accounts = await postPlanifyApiList.call(this, '/social-accounts');
	return accounts
		.filter((account) => !workspaceId || account.workspaceId === workspaceId)
		.map((account) => ({ name: socialAccountLabel(account), value: String(account.id) }));
}
