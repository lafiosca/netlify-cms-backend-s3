import React from 'react';

export interface Credentials {
	email: string;
	password: string;
}

export interface UserData {
	foo: any;
}

interface State {
	email: string;
	password: string;
}

interface Props {
	onLogin: (credentials: Credentials) => void;
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

class CognitoUserPoolAuth extends React.Component<Props, State> {
	state = {
		session: null,
		loginError: null,
		email: '',
		password: '',
	};

	private handleLogin = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
		event.preventDefault();
		const { email, password } = this.state;
		this.props.onLogin({ email, password });
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
						{inProgress ? 'Logging in' : 'Log In'}
					</button>
					{/* <div className="lds-spinner">
						<div /><div /><div /><div /><div /><div /><div /><div /><div /><div /><div /><div />
					</div> */}
				</div>
				<br />
				{loginError && (
					<p className="error">Failed to log in: {loginError}</p>
				)}
			</div>
		);
	}
}

export default CognitoUserPoolAuth;
