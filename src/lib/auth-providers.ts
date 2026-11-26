// Supabase exposes only enabled providers; the UI discovers that configuration live.
export const socialProviders = [
  { id: "google", name: "Google" },
  { id: "github", name: "GitHub" },
  { id: "apple", name: "Apple" },
  { id: "azure", name: "Microsoft" },
  { id: "discord", name: "Discord" },
  { id: "gitlab", name: "GitLab" },
  { id: "bitbucket", name: "Bitbucket" },
  { id: "linkedin_oidc", name: "LinkedIn" },
  { id: "slack_oidc", name: "Slack" },
  { id: "notion", name: "Notion" },
  { id: "figma", name: "Figma" },
  { id: "twitch", name: "Twitch" },
  { id: "spotify", name: "Spotify" },
  { id: "facebook", name: "Facebook" },
  { id: "zoom", name: "Zoom" },
  { id: "kakao", name: "Kakao" },
  { id: "x", name: "X" },
  { id: "twitter", name: "Twitter" },
  { id: "keycloak", name: "Keycloak" },
  { id: "workos", name: "WorkOS" },
  { id: "fly", name: "Fly.io" },
] as const;

export type SocialProvider = (typeof socialProviders)[number]["id"];
