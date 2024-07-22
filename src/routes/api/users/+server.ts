import { json } from '@sveltejs/kit';

export async function GET(event) {
	const companyDetails = {
		name: 'My Company',
		employees: [
			{ name: 'John Doe', salary: 45000 },
			{ name: 'Jane Larkin', salary: 42000 },
			{ name: 'Jim Salmon', salary: 38000 }
		],
		customers: [
			{ name: 'Bills Toys Inc', income: 30000 },
			{ name: 'Silly Co', income: 25000 },
			{ name: 'Rox R Us', income: 20000 }
		]
	};

	return json(companyDetails);
}