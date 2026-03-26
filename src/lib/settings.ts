import { cache } from "react";
import { getAppSettings as getSettings } from "./db";

export const getAppSettings = cache(async () => {
  return getSettings();
});
