/** Alt links grouped by their main account, for the `/whois/alt` management UI. */
export type AltGroup = {
	sourceId: string;
	mainSteamId: string;
	mainPermName: string | null;
	alts: { steamid: string; linkedAt: Date; linkedBy: string | null }[];
};
