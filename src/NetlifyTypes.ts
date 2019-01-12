import { Map } from 'immutable';
import { UserData } from './CognitoUserPoolAuth';

export interface CmsConfig extends Map<string, any> {}

export interface BackendOptions {
	useWorkflow: boolean;
	updateUserCredentials: (user: UserData) => void;
	initialWorkflowStatus: string;
}
