import '/node_modules/flag-icons/css/flag-icons.min.css';

export const pickupSites: PickupSite[] = [
    { name: 'ar.tf2pickup.org', icon: 'ar' },
    { name: 'br.tf2pickup.org', icon: 'br' },
    { name: 'hl.br.tf2pickup.org', icon: 'br' },
    { name: 'hl.tf2pickup.eu', icon: 'eu' },
    { name: 'tf2pickup.co.il', icon: 'il' },
    { name: 'tf2pickup.cz', icon: 'cz' },
    { name: 'tf2pickup.de', icon: 'de' },
    { name: 'tf2pickup.eu', icon: 'eu' },
    { name: 'tf2pickup.es', icon: 'es' },
    { name: 'tf2pickup.fi', icon: 'fi' },
    { name: 'tf2pickup.pl', icon: 'pl' },
    { name: 'tf2pickup.pt', icon: 'pt' },
    { name: 'tf2pickup.ru', icon: 'ru' },
    { name: 'tf2pickup.se', icon: 'se' },
];

export interface PickupSite {
    name: string;
    icon: string;
}
