// Copyright Operaton contributors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at:
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import type { UserConfig } from "@commitlint/types";

const config: UserConfig = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      [
        "ci",
        "config",
        "deps",
        "deps-dev",
        "docs",
        "epic-1",
        "epic-2",
        "epic-3",
        "epic-4",
        "epic-5",
        "epic-6",
        "epic-7",
        "epic-8",
        "epic-9",
      ],
    ],
    "body-max-line-length": [2, "always", 180],
  },
};

export default config;
