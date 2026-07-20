declare module 'node-steam-openid' {
	type SteamAuthOptions = {
		realm: string;
		returnUrl: string;
		apiKey: string;
	};

	type SteamAuthenticatedUser = {
		steamid: string;
		username: string;
		name: string | null;
		avatar: {
			small: string;
			medium: string;
			large: string;
		};
	};

	export default class SteamAuth {
		constructor(options: SteamAuthOptions);
		getRedirectUrl(): Promise<string>;
		authenticate(req: Request): Promise<SteamAuthenticatedUser>;
	}
}
