import { writable, derived } from 'svelte/store';

/**
 * Municipality selection state
 */
export interface MunicipalitySelection {
	/** Prefecture name (e.g., "東京都") */
	prefecture: string | null;
	/** Municipality name (e.g., "千代田区") */
	municipality: string | null;
	/** Municipality code (5-digit code) */
	code: string | null;
	/** Geographic bounds [minLng, minLat, maxLng, maxLat] */
	bounds: [number, number, number, number] | null;
}

/**
 * Initial selection state
 */
const initialState: MunicipalitySelection = {
	prefecture: null,
	municipality: null,
	code: null,
	bounds: null
};

/**
 * Municipality selection store
 */
function createMunicipalitySelectionStore() {
	const { subscribe, set, update } = writable<MunicipalitySelection>(initialState);
	
	return {
		subscribe,
		
		/**
		 * Set the entire selection
		 */
		setSelection: (selection: MunicipalitySelection) => {
			set(selection);
			// セッションストレージに保存
			if (typeof window !== 'undefined') {
				sessionStorage.setItem('municipalitySelection', JSON.stringify(selection));
			}
		},
		
		/**
		 * Update prefecture selection
		 */
		setPrefecture: (prefecture: string | null) => {
			update(state => ({
				...state,
				prefecture,
				// 都道府県が変更されたら市区町村をクリア
				municipality: null,
				code: null,
				bounds: null
			}));
		},
		
		/**
		 * Update municipality selection
		 */
		setMunicipality: (municipality: string | null, code: string | null = null) => {
			update(state => ({
				...state,
				municipality,
				code
			}));
		},
		
		/**
		 * Update geographic bounds
		 */
		setBounds: (bounds: [number, number, number, number] | null) => {
			update(state => ({
				...state,
				bounds
			}));
		},
		
		/**
		 * Clear all selections
		 */
		clear: () => {
			set(initialState);
			// セッションストレージからも削除
			if (typeof window !== 'undefined') {
				sessionStorage.removeItem('municipalitySelection');
			}
		},
		
		/**
		 * Load selection from session storage
		 */
		loadFromSession: () => {
			if (typeof window !== 'undefined') {
				const saved = sessionStorage.getItem('municipalitySelection');
				if (saved) {
					try {
						const selection = JSON.parse(saved);
						set(selection);
						return selection;
					} catch (e) {
						console.error('Failed to parse saved selection:', e);
					}
				}
			}
			return null;
		}
	};
}

/**
 * Municipality selection store instance
 */
export const municipalitySelection = createMunicipalitySelectionStore();

/**
 * Derived store: whether selection is complete
 */
export const isSelectionComplete = derived(
	municipalitySelection,
	$selection => !!($selection.prefecture && $selection.municipality && $selection.code)
);

/**
 * Derived store: selection display text
 */
export const selectionDisplayText = derived(
	municipalitySelection,
	$selection => {
		if ($selection.municipality && $selection.prefecture) {
			return `${$selection.prefecture} ${$selection.municipality}`;
		} else if ($selection.prefecture) {
			return $selection.prefecture;
		}
		return '未選択';
	}
);

/**
 * Helper function to parse URL parameters
 */
export function parseSelectionFromURL(url: URL): MunicipalitySelection | null {
	const prefecture = url.searchParams.get('prefecture');
	const municipality = url.searchParams.get('municipality');
	const code = url.searchParams.get('code');
	
	if (prefecture && municipality && code) {
		return {
			prefecture,
			municipality,
			code,
			bounds: null // TODO: boundsの取得方法を検討
		};
	}
	
	return null;
}

/**
 * Helper function to create URL parameters from selection
 */
export function createSelectionParams(selection: MunicipalitySelection): URLSearchParams {
	const params = new URLSearchParams();
	
	if (selection.prefecture) {
		params.set('prefecture', selection.prefecture);
	}
	if (selection.municipality) {
		params.set('municipality', selection.municipality);
	}
	if (selection.code) {
		params.set('code', selection.code);
	}
	
	return params;
}