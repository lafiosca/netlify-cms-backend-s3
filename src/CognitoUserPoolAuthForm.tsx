import React from 'react';
import { AuthCredentials } from './S3Backend';

interface Props {
	onLogin: (credentials: AuthCredentials) => void;
	error: string | null;
	inProgress: boolean;

	// onLogin: this.handleLogin.bind(this),
	// error: auth && auth.get('error'),
	// isFetching: auth && auth.get('isFetching'),
	// inProgress: (auth && auth.get('isFetching')) || false,
	// siteId: this.props.config.getIn(['backend', 'site_domain']),
	// base_url: this.props.config.getIn(['backend', 'base_url'], null),
	// authEndpoint: this.props.config.getIn(['backend', 'auth_endpoint']),
	// config: this.props.config,
	// clearHash: () => history.replace('/'),
}

interface State {
	email: string;
	password: string;
}

class CognitoUserPoolAuthForm extends React.Component<Props, State> {
	state = {
		session: null,
		loginError: null,
		email: '',
		password: '',
	};

	private handleLogin = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
		event.preventDefault();
		const { email, password } = this.state;
		if (email && password) {
			this.props.onLogin({ email, password });
		}
	}

	private updateEmail = (event: React.ChangeEvent<HTMLInputElement>) =>
		this.setState({ email: event.currentTarget.value })

	private updatePassword = (event: React.ChangeEvent<HTMLInputElement>) =>
		this.setState({ password: event.currentTarget.value })

	render() {
		const { inProgress } = this.props;
		const { email, password, loginError } = this.state;

		return (
			<div>
				<h2>Login</h2>
				<label htmlFor="username">
					Email:
					<input
						id="email"
						type="text"
						value={email}
						onChange={this.updateEmail}
						disabled={inProgress}
					/>
				</label>
				<br />
				<label htmlFor="password">
					Password:
					<input
						id="password"
						type="password"
						value={password}
						onChange={this.updatePassword}
						disabled={inProgress}
					/>
				</label>
				<br />
				<div>
					<button
						onClick={this.handleLogin}
						disabled={inProgress}
					>
						{inProgress ? 'Logging in...' : 'Login'}
					</button>
					{/* <div className="lds-spinner">
						<div /><div /><div /><div /><div /><div /><div /><div /><div /><div /><div /><div />
					</div> */}
				</div>
				<br />
				{loginError && (
					<p>Failed to log in: {loginError}</p>
				)}
			</div>
		);
	}
}

export default CognitoUserPoolAuthForm;
