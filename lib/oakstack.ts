import { Oakstack } from "oakstack";

/** One client for the whole app. Reads OAKSTACK_API_KEY. Server code only. */
export const oakstack = new Oakstack();

/** The shop owner is "user" owner in push notifications: their devices register under this id. */
export const OWNER_USER_ID = "shop-owner";
