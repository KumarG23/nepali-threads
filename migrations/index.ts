import * as migration_20260518_194746_initial from './20260518_194746_initial';
import * as migration_20260524_195131_add_pages from './20260524_195131_add_pages';
import * as migration_20260525_155953_homepage_hero from './20260525_155953_homepage_hero';
import * as migration_20260526_231000_customer_email_verification from './20260526_231000_customer_email_verification';

export const migrations = [
  {
    up: migration_20260518_194746_initial.up,
    down: migration_20260518_194746_initial.down,
    name: '20260518_194746_initial',
  },
  {
    up: migration_20260524_195131_add_pages.up,
    down: migration_20260524_195131_add_pages.down,
    name: '20260524_195131_add_pages',
  },
  {
    up: migration_20260525_155953_homepage_hero.up,
    down: migration_20260525_155953_homepage_hero.down,
    name: '20260525_155953_homepage_hero'
  },
  {
    up: migration_20260526_231000_customer_email_verification.up,
    down: migration_20260526_231000_customer_email_verification.down,
    name: '20260526_231000_customer_email_verification'
  },
];
