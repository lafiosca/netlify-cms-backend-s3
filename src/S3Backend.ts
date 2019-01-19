import { Auth } from 'aws-amplify';
import { Credentials } from '@aws-amplify/core';
import awsSdk from 'aws-sdk';
import {
	HeadObjectRequest,
	PutObjectRequest,
} from 'aws-sdk/clients/s3';
import {
	CognitoUserSession,
	CognitoIdToken,
	CognitoAccessToken,
	CognitoRefreshToken,
} from 'amazon-cognito-identity-js';
import { Map } from 'immutable';
import uuid from 'uuid/v4';
import CognitoUserPoolAuthForm from './CognitoUserPoolAuthForm';

const defaultBasePrefixPublished = 'published';
const defaultBasePrefixUnpublished = 'unpublished';
const defaultBasePrefixMedia = 'media';

export interface AuthCredentials {
	email: string;
	password: string;
}

interface PlainCognitoUserSession {
	idToken: string;
	accessToken: string;
	refreshToken: string;
}

interface CmsConfig extends Map<string, any> {}

interface BackendOptions {
	useWorkflow: boolean;
	updateUserCredentials: (user: PlainCognitoUserSession) => void;
	initialWorkflowStatus: string;
}

interface EntryToPersist {
	path: string;
	slug: string;
	raw: string;
}

interface PersistEntryOptions {
	newEntry: boolean;
	parsedData?: {
		title?: string;
		description?: string;
	};
	collectionName: string;
	useWorkflow: boolean;
	commitMessage: string;
	hasAssetStore: boolean;
}

interface UnpublishedEntry {
	data: string;
	file: {
		path: string;
	};
	slug: string;
	metaData: {
		collection: string;
		status: string;
		title?: string;
		description?: string;
	};
}

interface DeleteFileOptions {
	collection: CmsConfig;
	slug: string;
}

interface SimpleConfig {
	[key: string]: any;
}

interface AssetProxy {
	value: string;
	fileObj: File;
	path: string;
	public_path: string;
	sha: string | null;
	uploaded: boolean;
	toBase64: () => string;
}

class S3Backend {
	config: CmsConfig;
	options: BackendOptions;
	token: string = '';
	storageConfig: SimpleConfig;

	constructor(config: CmsConfig, options: BackendOptions) {
		console.log('S3Backend::constructor');
		this.config = config;
		this.options = options;
		Auth.configure({
			Auth: this.fetchAuthConfig(config),
		});
		this.storageConfig = this.fetchStorageConfig(config);
	}

	private generateConfigFetcher = (section: string, required: string[]) =>
		(config: SimpleConfig) => {
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

	private fetchAuthConfig = this.generateConfigFetcher(
		'auth',
		[
			'identityPoolId',
			'region',
			'userPoolId',
			'userPoolWebClientId',
		],
	);

	private fetchStorageConfig = this.generateConfigFetcher(
		'storage',
		['bucket', 'region'],
	);

	private getS3 = async () => new awsSdk.S3({
		apiVersion: '2006-03-01',
		region: this.storageConfig.region,
		credentials: Auth.essentialCredentials(
			await Auth.currentCredentials(),
		),
	})

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

	authenticate = async (credentials: AuthCredentials): Promise<PlainCognitoUserSession> => {
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
		// FIXME: determine why refresh token is not being used
		return session;
	}

	logout = async () => {
		console.log('S3Backend::logout');
		this.token = '';
		await Auth.signOut();
	}

	getToken = () => {
		console.log('S3Backend::getToken');
		// TODO: learn more about what use, if any, this token provides
		return this.token;
	}

	/*** Published entries ***/

	entriesByFiles = async (collection: CmsConfig) => {
		// throw new Error('Not implemented');
		console.log('S3Backend::entriesByFiles');
		console.log(`collection: ${JSON.stringify(collection, null, 2)}`);
		return [{
			file: {
				path: 'blog/howdy.md',
				label: 'foobar',
			},
			data: '---\npath: hello\ndate: 2019-01-15T02:01:10.670Z\ntitle: howdy\n---\nhow ya doin\n',
		}];
	}

	entriesByFolder = async (collection: CmsConfig, extension: string) => {
		// throw new Error('Not implemented');
		console.log('S3Backend::entriesByFolder');
		console.log(`collection: ${JSON.stringify(collection, null, 2)}`);
		console.log(`extension: ${extension}`);
		return [{
			file: {
				path: 'blog/howdy.md',
			},
			data: '---\npath: hello\ndate: 2019-01-15T02:01:10.670Z\ntitle: howdy\n---\nhow ya doin\n',
		}];
	}

	persistEntry = async (entry: EntryToPersist, mediaFiles: any, options: PersistEntryOptions) => {
		console.log('S3Backend::persistEntry');
		// entry: {
		// 	"path": "blog/test-title.md",
		// 	"slug": "test-title",
		// 	"raw": "---\npath: test-path\ndate: 2019-01-15T05:16:43.109Z\ntitle: test-title\n
		//          ---\ntest-body\n"
		// }
		// mediaFiles: []
		// options: {
		// 	"newEntry": true,
		// 	"parsedData": {
		// 	  "title": "test-title",
		// 	  "description": "No Description!"
		// 	},
		// 	"commitMessage": "Create Blog “test-title”",
		// 	"collectionName": "blog",
		// 	"useWorkflow": true,
		// 	"hasAssetStore": false
		// }
		console.log(`entry: ${JSON.stringify(entry, null, 2)}`);
		console.log(`mediaFiles: ${JSON.stringify(mediaFiles, null, 2)}`);
		console.log(`args: ${JSON.stringify(options, null, 2)}`);
		const s3 = await this.getS3();
		const prefix = options.useWorkflow
			? `${defaultBasePrefixUnpublished}/`
			: `${defaultBasePrefixPublished}/`;
		const headParams: HeadObjectRequest = {
			Bucket: this.storageConfig.bucket,
			Key: `${prefix}${entry.path}`,
		};
		const putParams: PutObjectRequest = {
			...headParams,
			ContentType: 'text/markdown; charset=UTF-8',
			Body: Buffer.from(entry.raw, 'utf8'),
			Metadata: {
				slug: encodeURIComponent(entry.slug),
				collection: encodeURIComponent(options.collectionName),
			},
		};
		if (options.parsedData) {
			if (options.parsedData.title) {
				putParams.Metadata!.title = encodeURIComponent(options.parsedData.title);
			}
			if (options.parsedData.description) {
				putParams.Metadata!.description = encodeURIComponent(options.parsedData.description);
			}
		}
		if (options.useWorkflow) {
			putParams.Metadata!.status = encodeURIComponent(this.options.initialWorkflowStatus);
			if (!options.newEntry) {
				try {
					const head = await s3.headObject(headParams).promise();
					console.log('Reusing existing object metadata:');
					console.log(head.Metadata);
					if (head.Metadata!.status) {
						putParams.Metadata!.status = head.Metadata!.status;
					} else {
						console.error('Existing unpublished entry does not contain status');
					}
				} catch (error) {
					if (error.code === 'NotFound') {
						console.error('Existing unpublished entry not found');
					} else {
						console.error('Failed to get head for object');
						throw error;
					}
				}
			}
		}
		console.log(`putParams: ${JSON.stringify(putParams, null, 2)}`);
		await s3.putObject(putParams).promise();
	}

	getEntry = async (collection: CmsConfig, slug: string, path: string) => {
		console.log('S3Backend::getEntry');
		console.log(`collection: ${JSON.stringify(collection, null, 2)}`);
		console.log(`slug: ${slug}`);
		console.log(`path: ${path}`);
		throw new Error('Not implemented');
	}

	/*** Media Library ***/

	persistMedia = async (mediaFile: AssetProxy, { commitMessage }: { commitMessage: string }) => {
		console.log('S3Backend::persistMedia');
		console.log(`mediaFile: ${JSON.stringify(mediaFile, null, 2)}`);
		console.log(`commitMessage: ${commitMessage}`);
		const s3 = await this.getS3();
		const id = uuid();
		const { path, value, fileObj } = mediaFile;
		const putParams: PutObjectRequest = {
			Bucket: this.storageConfig.bucket,
			Key: `${defaultBasePrefixMedia}${path}/${id}`,
			ContentType: fileObj.type,
			Body: fileObj,
		};
		console.log('putParams:');
		console.log(putParams);
		await s3.putObject(putParams).promise();
		const url = await s3.getSignedUrl('getObject', {
			Bucket: putParams.Bucket,
			Key: putParams.Key,
		});
		return {
			id,
			path,
			url,
			name: value,
			size: fileObj.size,
		};
	}

	getMedia = async () => {
		console.log('S3Backend::getMedia');
		const mediaFolder: string = this.config.get('media_folder');
		if (!mediaFolder) {
			throw new Error('No media_folder configured');
		}
		const prefix = `${defaultBasePrefixMedia}/${mediaFolder}/`;
		const s3 = await this.getS3();
		const objectList = await s3.listObjectsV2({
			Bucket: this.storageConfig.bucket,
			Prefix: prefix,
			// TODO: implement pagination
			// MaxKeys: 1000,
			// ContinuationToken: foo,
		}).promise();
		if (objectList.IsTruncated) {
			// TODO: implement pagination
			// objectList.NextContinuationToken
			console.log('Received truncated object list; implement pagination!');
		}
		return objectList.Contents!.map((object) => {
			const parts = object.Key!.substr(defaultBasePrefixMedia.length).split('/');
			const id = parts.pop();
			const path = `${parts.join('/')}`;
			const name = parts.pop();
			const url = s3.getSignedUrl('getObject', {
				Bucket: this.storageConfig.bucket,
				Key: object.Key!,
			});
			return {
				id,
				name,
				path,
				url,
			};
		});
	}

	/*** Published Entries and Media Library ***/

	deleteFile = async (path: string, commitMessage: string, options?: DeleteFileOptions) => {
		console.log('S3Backend::deleteFile');
		console.log(`path: ${path}`);
		console.log(`commitMessage: ${commitMessage}`);
		if (options) { // entry file
			const { collection, slug } = options;
			console.log(`collection: ${JSON.stringify(collection, null, 2)}`);
			console.log(`slug: ${slug}`);
		} else { // media file
			const s3 = await this.getS3();

			// find matching paths including id, should only be one
			const prefix = `${defaultBasePrefixMedia}${path}/`;
			const objectList = await s3.listObjectsV2({
				Bucket: this.storageConfig.bucket,
				Prefix: prefix,
			}).promise();

			// delete all of them
			const deletions = objectList.Contents!.map((object) => {
				console.log(`Found ${object.Key!}`);
				return s3.deleteObject({
					Bucket: this.storageConfig.bucket,
					Key: object.Key!,
				}).promise();
			});

			console.log(`Deleting ${deletions.length} object(s)`);

			return Promise.all(deletions);
		}

		throw new Error('Not implemented');
	}

	/*** Editorial Workflow ***/

	unpublishedEntries = async () => {
		console.log('S3Backend::unpublishedEntries');

		const prefix = `${defaultBasePrefixUnpublished}/`;
		const s3 = await this.getS3();

		console.log(`list object beginning with '${prefix}'`);
		const objectList = await s3.listObjectsV2({
			Bucket: this.storageConfig.bucket,
			Prefix: prefix,
			MaxKeys: 10,
			// TODO: implement pagination
			// ContinuationToken: foo,
		}).promise();

		if (objectList.IsTruncated) {
			// TODO: implement pagination
			// objectList.NextContinuationToken
			console.log('Received truncated object list; implement pagination!');
		}

		console.log(`Fetch ${objectList.Contents!.length} objects`);
		const objects = await Promise.all(objectList.Contents!.map((object) => {
			const getParams = {
				Bucket: this.storageConfig.bucket,
				Key: object.Key!,
			};
			return s3.getObject(getParams).promise();
		}));

		console.log(`Return ${objects.length} objects`);
		return objects.map((object, i) => {
			console.log(`Process object ${JSON.stringify(object, null, 2)}`);
			const path = objectList.Contents![i].Key!.substr(prefix.length);
			const entry: UnpublishedEntry = {
				data: object.Body!.toString(),
				file: { path },
				slug: decodeURIComponent(object.Metadata!.slug),
				metaData: {
					collection: decodeURIComponent(object.Metadata!.collection),
					status: decodeURIComponent(object.Metadata!.status),
				},
			};
			if (object.Metadata!.title) {
				entry.metaData.title = decodeURIComponent(object.Metadata!.title);
			}
			if (object.Metadata!.description) {
				entry.metaData.description = decodeURIComponent(object.Metadata!.description);
			}
			console.log(`unpublished entry: ${JSON.stringify(entry, null, 2)}`);
			return entry;
		});
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
