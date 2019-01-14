import { Auth } from 'aws-amplify';
import { Credentials } from '@aws-amplify/core';

import CognitoUserPoolAuthForm from './CognitoUserPoolAuthForm';
import { CmsConfig, BackendOptions } from './NetlifyTypes';
import {
	CognitoUserSession,
	CognitoIdToken,
	CognitoAccessToken,
	CognitoRefreshToken,
} from 'amazon-cognito-identity-js';

export interface Credentials {
	email: string;
	password: string;
}

interface Entry {
	raw: string;
	path: string;
}

interface PersistEntryArgs {
	newEntry: boolean;
	parsedData: {
		title: string;
		description: string;
	};
	collectionName: string;
	useWorkflow: boolean;
	commitMessage: string;
	hasAssetStore: boolean;
}

interface PlainCognitoUserSession {
	idToken: string;
	accessToken: string;
	refreshToken: string;
}

class S3Backend {
	config: CmsConfig;
	options: BackendOptions;
	token: string = '';

	constructor(config: CmsConfig, options: BackendOptions) {
		console.log('S3Backend::constructor');
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

	hydrateSession = (session: PlainCognitoUserSession): CognitoUserSession =>
		new CognitoUserSession({
			IdToken: new CognitoIdToken({ IdToken: session.idToken }),
			AccessToken: new CognitoAccessToken({ AccessToken: session.accessToken }),
			RefreshToken: new CognitoRefreshToken({ RefreshToken: session.refreshToken }),
		})

	dehydrateSession = (session: CognitoUserSession): PlainCognitoUserSession => ({
		idToken: session.getIdToken().getJwtToken(),
		accessToken: session.getAccessToken().getJwtToken(),
		refreshToken: session.getRefreshToken().getToken(),
	})

	authenticate = async (credentials: Credentials): Promise<PlainCognitoUserSession> => {
		console.log('S3Backend::authenticate');
		const user = await Auth.signIn(credentials.email, credentials.password);
		if (user.challengeName) {
			throw new Error(`Login challenge handling not implemented for: ${user.challengeName}`);
		}
		const session = this.dehydrateSession(await Auth.currentSession());
		this.token = session.idToken;
		return session;
	}

	restoreUser = async (user: PlainCognitoUserSession): Promise<PlainCognitoUserSession> => {
		console.log('S3Backend::restoreUser');
		console.log(`user: ${JSON.stringify(user, null, 2)}`);
		console.log('attempt to manually set credentials');
		await Credentials.set(this.hydrateSession(user), 'session');
		console.log('credentials set, fetch current session');
		const session = this.dehydrateSession(await Auth.currentSession());
		console.log(`got current session, returning: ${JSON.stringify(session, null, 2)}`);
		return session;
	}

	logout = async () => {
		console.log('S3Backend::logout');
		this.token = '';
		await Auth.signOut();
	}

	getToken = () => {
		console.log('S3Backend::getToken');
		return this.token;
	}

	/*** Published entries ***/

	entriesByFiles = async (collection: CmsConfig) => {
		// throw new Error('Not implemented');
		console.log('S3Backend::entriesByFiles');
		console.log(`collection: ${JSON.stringify(collection, null, 2)}`);
		return [
			{
				file: {
					path: 'foo',
				},
				data: `
Hello world

123
`,
			},
		];
	}

	entriesByFolder = async (collection: CmsConfig, extension: string) => {
		// throw new Error('Not implemented');
		console.log('S3Backend::entriesByFolder');
		console.log(`collection: ${JSON.stringify(collection, null, 2)}`);
		console.log(`extension: ${extension}`);
		return [
			{
				file: {
					path: 'foo',
				},
				data: `
Hello world

123
`,
			},
		];
	}

	// allEntriesByFolder

	persistEntry = async (entry: Entry, mediaFiles: any, args: PersistEntryArgs) => {
		console.log('S3Backend::persistEntry');
		console.log(`entry: ${JSON.stringify(entry, null, 2)}`);
		console.log(`mediaFiles: ${JSON.stringify(mediaFiles, null, 2)}`);
		console.log(`args: ${JSON.stringify(args, null, 2)}`);
		throw new Error('Not implemented');
	}

	getEntry = async (collection: CmsConfig, slug: string, path: string) => {
		console.log('S3Backend::getEntry');
		console.log(`collection: ${JSON.stringify(collection, null, 2)}`);
		console.log(`slug: ${slug}`);
		console.log(`path: ${path}`);
		throw new Error('Not implemented');
	}

	/*** Media Library ***/

	persistMedia = async (mediaFile: any, { commitMessage }: { commitMessage: string }) => {
		console.log('S3Backend::persistMedia');
		console.log(`mediaFile: ${JSON.stringify(mediaFile, null, 2)}`);
		console.log(`commitMessage: ${commitMessage}`);
		throw new Error('Not implemented');
	}

	getMedia = async () => {
		console.log('S3Backend::getMedia');
		throw new Error('Not implemented');
	}

	deleteMedia = async (path: string) => {
		console.log('S3Backend::deleteMedia');
		console.log(`path: ${path}`);
		throw new Error('Not implemented');
	}

	/*** Editorial Workflow ***/

	unpublishedEntries = async () => {
		console.log('S3Backend::unpublishedEntries');
		throw new Error('Not implemented');
	}

	unpublishedEntry = async (collection: CmsConfig, slug: string) => {
		console.log('S3Backend::unpublishedEntry');
		console.log(`collection: ${JSON.stringify(collection, null, 2)}`);
		console.log(`slug: ${slug}`);
		throw new Error('Not implemented');
	}

	updateUnpublishedEntryStatus = async (collection: CmsConfig, slug: string, newStatus: any) => {
		console.log('S3Backend::updateUnpublishedEntryStatus');
		console.log(`collection: ${JSON.stringify(collection, null, 2)}`);
		console.log(`slug: ${slug}`);
		console.log(`newStatus: ${newStatus}`);
		throw new Error('Not implemented');
	}

	publishUnpublishedEntry = async (collection: CmsConfig, slug: string) => {
		console.log('S3Backend::publishUnpublishedEntry');
		console.log(`collection: ${JSON.stringify(collection, null, 2)}`);
		console.log(`slug: ${slug}`);
		throw new Error('Not implemented');
	}

	deleteUnpublishedEntry = async (collection: CmsConfig, slug: string) => {
		console.log('S3Backend::deleteUnpublishedEntry');
		console.log(`collection: ${JSON.stringify(collection, null, 2)}`);
		console.log(`slug: ${slug}`);
		throw new Error('Not implemented');
	}

	/*** Pagination ***/

	// traverseCursor = () => {
	// 	// ?
	// }
}

export default S3Backend;
