import "server-only";
import { db } from "./firebase";

// One place that names the Firestore collections, so a typo can't create a new one.
export const users = () => db().collection("users");
export const suppliers = () => db().collection("suppliers");
export const bookings = () => db().collection("bookings");
export const complaints = () => db().collection("complaints");
export const serviceCatalog = () => db().collection("services");
export const settings = () => db().collection("settings");
export const settlements = () => db().collection("settlements");
