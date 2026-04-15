import type { Config } from "jest";
import "dotenv/config";

const config: Config = {
  setupFiles: ["dotenv/config"],
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
      },
    ],
  },
  collectCoverageFrom: [
    "src/app/api/**/*.ts",
    "src/lib/**/*.ts",
    "!src/lib/prisma.ts",
    "!src/lib/theme.tsx",
    "!src/lib/auth.ts",
    "!src/lib/auth-helpers.ts",
    "!src/lib/playgroup.ts",
    "!src/app/api/cards/recommendations/**",
    "!src/app/api/auth/**",
    "!src/**/*.d.ts",
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};

export default config;
