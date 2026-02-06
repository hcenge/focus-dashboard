/// <reference types="astro/client" />

import type { AuthKey } from '@/lib/db';

declare namespace App {
  interface Locals {
    authKey: AuthKey;
  }
}
