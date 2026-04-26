import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/isco-trend": [
      "../ESCO dataset - v1.2.1 - classification - en - csv/ISCO/EMP_TEMP_SEX_AGE_OCU_NB_A-filtered-2026-04-26.csv",
    ],
    "/api/isco-education": [
      "../ESCO dataset - v1.2.1 - classification - en - csv/ISCO/EMP_TEMP_SEX_OCU_EDU_NB_A-filtered-2026-04-26.csv",
    ],
  },
};

export default nextConfig;
