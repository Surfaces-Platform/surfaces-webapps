import {
  REFERENCE_TARGET_FIXTURE,
  getBenchmarkFixtureProfile,
  type BenchmarkFixtureProfile,
  type BenchmarkGuidanceStrategy,
} from "./benchmark-fixtures";

export type ReferenceTargetGuidanceStrategy = BenchmarkGuidanceStrategy;
export type ReferenceTargetBenchmarkProfile = BenchmarkFixtureProfile;

export const REFERENCE_TARGET = REFERENCE_TARGET_FIXTURE;
export const REFERENCE_TARGET_BENCHMARK_PROFILE = getBenchmarkFixtureProfile(REFERENCE_TARGET.id);
