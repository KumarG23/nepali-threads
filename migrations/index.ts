import * as migration_20260518_194746_initial from './20260518_194746_initial';
import * as migration_20260524_195131_add_pages from './20260524_195131_add_pages';

export const migrations = [
  {
    up: migration_20260518_194746_initial.up,
    down: migration_20260518_194746_initial.down,
    name: '20260518_194746_initial',
  },
  {
    up: migration_20260524_195131_add_pages.up,
    down: migration_20260524_195131_add_pages.down,
    name: '20260524_195131_add_pages'
  },
];
