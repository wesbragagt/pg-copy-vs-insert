import type { Selectable } from "kysely";
import type { workers } from "./generated/db/types.ts";

export type CreateWorker = Pick<Selectable<workers>, 'name' | 'email' | 'phone' | 'address' | 'city' | 'state' | 'zip' | 'country'>;
