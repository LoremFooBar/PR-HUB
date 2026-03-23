const API = "https://api.github.com";

export function getRepoName(repositoryUrl: string): string {
  return repositoryUrl.replace(`${API}/repos/`, "");
}
