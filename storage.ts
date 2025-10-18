import Dexie, { Table } from 'dexie';
import { Note } from './types';

export class MySubClassedDexie extends Dexie {
  notes!: Table<Note>; 

  constructor() {
    super('focusAppDatabase');
    // Fix for "Property 'version' does not exist on type 'MySubClassedDexie'".
    // This seems to be an issue with the TypeScript environment's type inference for the subclass.
    (this as Dexie).version(1).stores({
      notes: 'id, type, content, timestamp'
    });
  }
}

export const db = new MySubClassedDexie();
