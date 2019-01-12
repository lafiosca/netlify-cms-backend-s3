import { Map } from 'immutable';
import { CognitoUserSession } from 'amazon-cognito-identity-js';

export interface CmsConfig extends Map<string, any> {}

export interface BackendOptions {
	useWorkflow: boolean;
	updateUserCredentials: (user: CognitoUserSession) => void;
	initialWorkflowStatus: string;
}
