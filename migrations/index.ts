import * as migration_20260518_194746_initial from './20260518_194746_initial';

export const migrations = [
  {
    up: migration_20260518_194746_initial.up,
    down: migration_20260518_194746_initial.down,
    name: '20260518_194746_initial'
  },
];
