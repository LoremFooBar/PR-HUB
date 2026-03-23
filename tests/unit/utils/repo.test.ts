import { getRepoName } from "../../../src/utils/repo";

describe("getRepoName", () => {
  it("strips the GitHub API prefix from a repository URL", () => {
    expect(getRepoName("https://api.github.com/repos/owner/repo")).toBe("owner/repo");
  });

  it("handles org/repo names with hyphens", () => {
    expect(getRepoName("https://api.github.com/repos/my-org/my-repo")).toBe("my-org/my-repo");
  });
});
