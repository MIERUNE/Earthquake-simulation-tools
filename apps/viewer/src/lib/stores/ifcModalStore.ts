import { writable } from 'svelte/store';

export type IFCDataType = 'fore' | 'after' | null;

export type IFCModalState = {
	isOpen: boolean;
	ifcFilePath: string | null;
	dataType: IFCDataType;
};

export type IFCElementProperties = {
	expressId: number;
	id: string;
	name: string;
	objectType: string;
	creationDate: number;
	applicationFullName: string;
} | null;

export const ifcModalState = writable<IFCModalState>({
	isOpen: false,
	ifcFilePath: null,
	dataType: null
});

export const selectedElement = writable<IFCElementProperties>(null);

export const ifcDataType = writable<IFCDataType>(null);
