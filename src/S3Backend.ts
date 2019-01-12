import { Auth } from 'aws-amplify';
import { Credentials } from '@aws-amplify/core';

import CognitoUserPoolAuthForm from './CognitoUserPoolAuthForm';
import { CmsConfig, BackendOptions } from './NetlifyTypes';
import { CognitoUserSession } from 'amazon-cognito-identity-js';

export interface Credentials {
	email: string;
	password: string;
}

class S3Backend {
	config: CmsConfig;
	options: BackendOptions;
	token: string = '';

	constructor(config: CmsConfig, options: BackendOptions) {
		this.config = config;
		this.options = options;
		this.configureAmplify(config);
	}

	private generateConfigFetcher = (section: string, required: string[]) =>
		(config: any) => {
			if (!config.getIn(['backend', section])) {
				throw new Error(`Missing backend ${section} config`);
			}
			const pickedConfig = required.reduce<{ [key: string]: any }>(
				(ac, field) => ({
					...ac,
					[field]: config.getIn(['backend', section, field]),
				}),
				{},
			);
			const missing = required.filter((field) => !pickedConfig[field]);
			if (missing.length > 0) {
				throw new Error(`Missing backend ${section} config fields: ${missing.join(', ')}`);
			}
			return pickedConfig;
		}

	private fetchAmplifyAuthConfig = this.generateConfigFetcher(
		'auth',
		[
			'identityPoolId',
			'region',
			'userPoolId',
			'userPoolWebClientId',
		],
	);

	private fetchAmplifyStorageConfig = this.generateConfigFetcher(
		'storage',
		['bucket', 'region'],
	);

	private configureAmplify = (config: any) => {
		Auth.configure({
			Auth: this.fetchAmplifyAuthConfig(config),
			Storage: this.fetchAmplifyStorageConfig(config),
		});
	}

	/*** Authentication ***/

	authComponent = () => CognitoUserPoolAuthForm;

	authenticate = async (credentials: Credentials): Promise<CognitoUserSession> => {
		const user = await Auth.signIn(credentials.email, credentials.password);
		if (user.challengeName) {
			throw new Error(`Login challenge handling not implemented for: ${user.challengeName}`);
		}
		const session = await Auth.currentSession();
		this.token = session.getIdToken().getJwtToken();
		return session;
	}

	restoreUser = async (user: CognitoUserSession): Promise<CognitoUserSession> => {
		await Credentials.set(user, 'session');
		const session = await Auth.currentSession();
		return session;
	}

	logout = async () => {
		this.token = '';
		await Auth.signOut();
	}

	getToken = () => this.token;

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
