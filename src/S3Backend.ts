import CognitoUserPoolAuth, { Credentials, UserData } from './CognitoUserPoolAuth';
import { CmsConfig, BackendOptions } from './NetlifyTypes';

class S3Backend {
	config: CmsConfig;
	options: BackendOptions;

	constructor(config: CmsConfig, options: BackendOptions) {
		this.config = config;
		this.options = options;
	}

	/*** Authentication ***/

	authComponent = () => CognitoUserPoolAuth;

	authenticate = async (credentials: Credentials): Promise<UserData> => {
		throw new Error('Not implemented');
	}

	restoreUser = async (user: UserData): Promise<UserData> => {
		throw new Error('Not implemented');
	}

	logout = () => {
		// forget credentials, sync or async
	}

	getToken = () => '';

	/*** Published entries ***/

	entriesByFiles = async (collection: CmsConfig) => {
		throw new Error('Not implemented');
	}

	entriesByFolder = async (collection: CmsConfig, extension: string) => {
		throw new Error('Not implemented');
	}

	// allEntriesByFolder

	persistEntry = async () => {
		throw new Error('Not implemented');
	}

	getEntry = async (collection: CmsConfig, slug: string, path: string) => {
		throw new Error('Not implemented');
	}

	/*** Media Library ***/

	persistMedia = async (mediaFile: any, { commitMessage }: { commitMessage: string }) => {
		throw new Error('Not implemented');
	}

	getMedia = async () => {
		throw new Error('Not implemented');
	}

	deleteMedia = async (path: string) => {
		throw new Error('Not implemented');
	}

	/*** Editorial Workflow ***/

	unpublishedEntries = async () => {
		throw new Error('Not implemented');
	}

	unpublishedEntry = async (collection: CmsConfig, slug: string) => {
		throw new Error('Not implemented');
	}

	updateUnpublishedEntryStatus = async (collection: CmsConfig, slug: string, newStatus: any) => {
		throw new Error('Not implemented');
	}

	publishUnpublishedEntry = async (collection: CmsConfig, slug: string) => {
		throw new Error('Not implemented');
	}

	deleteUnpublishedEntry = async (collection: CmsConfig, slug: string) => {
		throw new Error('Not implemented');
	}

	/*** Pagination ***/

	// traverseCursor = () => {
	// 	// ?
	// }
}

export default S3Backend;
