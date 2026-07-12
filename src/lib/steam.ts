// Build-time Steam data for SteamWidget.astro.
// Static site: this runs at each deploy, so the widget shows a snapshot,
// not live status — which is why we favor evergreen stats over "Online now".
//
// Two tiers:
//   1. Public profile XML (no key needed): persona, avatar, member-since.
//   2. Steam Web API (STEAM_API_KEY): library size, all-time hours, top games.
// Any failure degrades gracefully — the widget falls back to static copy.

const STEAM_ID = '76561197961795218'; // resolved from steamcommunity.com/id/SolarCurve
const PROFILE_URL = 'https://steamcommunity.com/id/SolarCurve/';
const API = 'https://api.steampowered.com';

export interface TopGame {
  name: string;
  hours: number;
  appid: number;
}

export interface SteamData {
  persona: string;
  avatar: string;
  memberSince: string; // e.g. "October 5, 2003"
  memberYears: number;
  profileUrl: string;
  // Present only when STEAM_API_KEY is configured:
  gameCount?: number;
  totalHours?: number;
  topGames?: TopGame[];
}

function xmlField(xml: string, tag: string): string | undefined {
  const m = xml.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?</${tag}>`));
  return m?.[1];
}

export async function getSteamData(): Promise<SteamData | null> {
  try {
    const res = await fetch(`${PROFILE_URL}?xml=1`);
    if (!res.ok) throw new Error(`profile XML ${res.status}`);
    const xml = await res.text();

    const persona = xmlField(xml, 'steamID');
    const avatar = xmlField(xml, 'avatarMedium');
    const memberSince = xmlField(xml, 'memberSince');
    if (!persona || !avatar || !memberSince) throw new Error('profile XML missing fields');

    const memberYears =
      new Date().getFullYear() - new Date(memberSince).getFullYear();

    const data: SteamData = {
      persona,
      avatar,
      memberSince,
      memberYears,
      profileUrl: PROFILE_URL,
    };

    const key = import.meta.env.STEAM_API_KEY;
    if (key) {
      const owned = await fetch(
        `${API}/IPlayerService/GetOwnedGames/v1/?key=${key}&steamid=${STEAM_ID}&include_appinfo=1&include_played_free_games=1`
      );
      if (owned.ok) {
        const body = await owned.json();
        const games: { name: string; playtime_forever: number; appid: number }[] =
          body?.response?.games ?? [];
        if (games.length) {
          data.gameCount = body.response.game_count ?? games.length;
          data.totalHours = Math.round(
            games.reduce((sum, g) => sum + g.playtime_forever, 0) / 60
          );
          data.topGames = games
            .sort((a, b) => b.playtime_forever - a.playtime_forever)
            .slice(0, 3)
            .map(g => ({
              name: g.name,
              hours: Math.round(g.playtime_forever / 60),
              appid: g.appid,
            }));
        }
      } else {
        console.warn(`[steam] GetOwnedGames failed: ${owned.status} — widget will omit library stats`);
      }
    }

    return data;
  } catch (err) {
    console.warn(`[steam] falling back to static widget: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}
