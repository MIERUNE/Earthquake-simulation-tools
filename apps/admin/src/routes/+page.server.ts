import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const BASE_PATH = process.env.BASE_PATH || '/admin';

export const load: PageServerLoad = async () => {
	throw redirect(302, `${BASE_PATH}/login`);
};
