import type { Selectable } from "kysely";
import type { workers } from "./generated/db/types.ts";

export type Worker = Selectable<workers>;
export type CreateWorker = Pick<Selectable<workers>, 'id' | 'name' | 'email' | 'phone' | 'address' | 'city' | 'state' | 'zip' | 'country'>;
