import "/node_modules/flag-icons/css/flag-icons.min.css";

export const pickupSites: PickupSite[] = [
    {name: 'ar.tf2pickup.org', icon: 'ar'},
    {name: 'au.tf2pickup.org', icon: 'au'},
    {name: 'bball.tf2pickup.eu', icon: 'eu'},
    {name: 'br.tf2pickup.org', icon: 'br'},
    {name: 'hl.tf2pickup.de', icon: 'de'},
    {name: 'hl.tf2pickup.eu', icon: 'eu'},
    {name: 'hl.tf2pickup.pl', icon: 'pl'},
    {name: 'hl.tf2pickup.ru', icon: 'ru'},
    {name: 'hl.tf2pickup.us', icon: 'us'},
    {name: 'tf2pickup.asia', icon: 'cn'},
    {name: 'tf2pickup.cz', icon: 'cz'},
    {name: 'tf2pickup.de', icon: 'de'},
    {name: 'tf2pickup.dk', icon: 'dk'},
    {name: 'tf2pickup.eu', icon: 'eu'},
    {name: 'tf2pickup.es', icon: 'es'},
    {name: 'tf2pickup.fi', icon: 'fi'},
    {name: 'tf2pickup.fr', icon: 'fr'},
    {name: 'tf2pickup.it', icon: 'it'},
    {name: 'tf2pickup.nl', icon: 'nl'},
    {name: 'tf2pickup.org', icon: 'gb'},
    {name: 'tf2pickup.pl', icon: 'pl'},
    {name: 'tf2pickup.pt', icon: 'pt'},
    {name: 'tf2pickup.ru', icon: 'ru'},
    {name: 'tf2pickup.se', icon: 'se'},
    {name: 'tf2pickup.tr', icon: 'tr'},
    {name: 'tf2pickup.us', icon: 'us'},
    {name: 'yu.tf2pickup.eu', icon: 'eu'},
]

export interface PickupSite {
    name: string;
    icon: string;
}
