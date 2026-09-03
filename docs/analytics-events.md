# Analytics events

Replit-hosted analytics injects the Umami tracker into published app pages. The
shared analytics wrapper safely does nothing when that tracker is unavailable
and contains tracker errors so analytics cannot block navigation.

## `live_test_series_started`

Recorded only after a student starts a live test and its questions load
successfully. Navigation, authentication prompts, abandoned pre-start screens,
failed loads, and sample or practice series are not included.

| Property | Type | Description |
| --- | --- | --- |
| `platform` | string | Source platform name, or `unknown` when the source does not provide one. |
| `category` | string | Test category, or `general` when it is missing. |
| `location` | string | Original discovery surface: `homepage`, `test_series_page`, `platform_results`, or a route fallback. |

The event contains no account identifiers, test titles, URLs, search text, or
other free-form user content.