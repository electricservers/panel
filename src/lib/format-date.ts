/** Zero-padded `dd/mm/yyyy`, the site-wide date format. */
export function formatDate(date: Date): string {
	const dd = String(date.getDate()).padStart(2, '0');
	const mm = String(date.getMonth() + 1).padStart(2, '0');
	const yyyy = date.getFullYear();
	return `${dd}/${mm}/${yyyy}`;
}

/** `dd/mm/yyyy HH:mm:ss` (24h), the site-wide date-time format. */
export function formatDateTime(date: Date): string {
	const hh = String(date.getHours()).padStart(2, '0');
	const min = String(date.getMinutes()).padStart(2, '0');
	const ss = String(date.getSeconds()).padStart(2, '0');
	return `${formatDate(date)} ${hh}:${min}:${ss}`;
}
