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

export const LICENSE_HEADER = `// Copyright Operaton contributors.
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
// limitations under the License.`;

/**
 * Returns true when the file content contains the license header.
 * Files that start with a shebang (#!) are also accepted — the header
 * must appear immediately after the shebang line.
 */
export function hasLicenseHeader(content: string): boolean {
  if (content.startsWith(LICENSE_HEADER)) return true;
  if (content.startsWith("#!")) {
    const newlinePos = content.indexOf("\n");
    if (newlinePos === -1) return false;
    const afterShebang = content.slice(newlinePos + 1);
    return afterShebang.startsWith(LICENSE_HEADER);
  }
  return false;
}
