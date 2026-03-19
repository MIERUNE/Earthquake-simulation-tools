// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces

import type { Session, AuthUser } from '$lib/types/auth';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			session: Session | null;
			user: AuthUser | null;
		}
		interface PageData {
			session: Session | null;
			user: AuthUser | null;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
