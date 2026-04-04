const RUN_ID = Date.now();
let counter = 0;

export function uniqueEmail(prefix = "e2e") {
  return `${prefix}+${RUN_ID}-${++counter}@test.local`;
}

export function uniqueName(prefix = "E2E User") {
  return `${prefix} ${RUN_ID}-${++counter}`;
}

export function uniqueDeckName(prefix = "E2E Deck") {
  return `${prefix} ${RUN_ID}-${++counter}`;
}

export const BASE_URL = "http://localhost:3000";
