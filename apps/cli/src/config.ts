import Conf from "conf";

interface NexusConfig {
  api_url: string;
  auth_token: string;
}

const config = new Conf<NexusConfig>({
  projectName: "nexus-cli",
  defaults: {
    api_url: "http://localhost:3000/api/v1",
    auth_token: "",
  },
});

export function getConfig(): NexusConfig {
  return {
    api_url: config.get("api_url"),
    auth_token: config.get("auth_token"),
  };
}

export function setConfig<K extends keyof NexusConfig>(
  key: K,
  value: NexusConfig[K]
): void {
  config.set(key, value);
}

export function getAuthHeaders(): Record<string, string> {
  const token = config.get("auth_token");
  if (!token) {
    return {};
  }
  return {
    Authorization: `Bearer ${token}`,
  };
}
