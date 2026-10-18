# n8n-nodes-postplanify

This is an n8n community node for [PostPlanify](https://postplanify.com), social media management software for agencies and teams. It lets you schedule posts to 10 platforms, upload media, reply to comments and read analytics from your n8n workflows.

Supported platforms: Instagram, Facebook, LinkedIn, X (Twitter), TikTok, YouTube, Threads, Bluesky, Pinterest and Google Business Profile.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

- [Installation](#installation)
- [Credentials](#credentials)
- [Operations](#operations)
- [Trigger](#trigger)
- [Example workflows](#example-workflows)
- [Using PostPlanify from an AI agent](#using-postplanify-from-an-ai-agent)
- [Compatibility](#compatibility)
- [Resources](#resources)

## Installation

**n8n Cloud and self-hosted (once verified by n8n):** open the nodes panel, search for **PostPlanify** and click **Install**.

**Self-hosted (manual):** go to **Settings > Community Nodes**, click **Install**, enter `n8n-nodes-postplanify` and confirm. See the [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) for details.

## Credentials

The node authenticates with a PostPlanify API key.

1. Sign in to [PostPlanify](https://postplanify.com) on a plan that includes API access.
2. Go to **Dashboard > API Keys** ([direct link](https://postplanify.com/dashboard/api-keys)) and create a key. It starts with `sk_live_`.
3. In n8n, create a new **PostPlanify API** credential and paste the key. Click **Save**: n8n tests the key straight away.

The key has the same access as your PostPlanify user: every workspace and social account you can see in the dashboard.

## Operations

| Resource | Operation | What it does |
| :--- | :--- | :--- |
| **Post** | Create | Schedule a post with text, images, videos or a PDF to one social account |
| | Get | Get a post with its status, publish time and engagement metrics |
| | Get Many | List posts in a workspace, filtered by status, account, platform or date |
| | Update | Change the caption, publish time or platform settings of a scheduled post |
| | Cancel | Stop a scheduled post from publishing (kept as cancelled) |
| | Delete | Delete a post from PostPlanify (published posts stay on the social network) |
| **Media** | Upload | Upload a file from a previous node, or a public URL, and get its media ID |
| | Get Many | List your API uploads and, optionally, a workspace media library |
| | Delete | Delete media you uploaded through n8n or the API |
| **Comment** | Get Many | List comments on Facebook, Instagram and LinkedIn posts, and Google Business reviews |
| | Get Replies | Get the replies to a comment |
| | Reply | Reply to a comment or review from your connected account |
| **Analytics** | Get Workspace Overview | Last 7 days for every account in a workspace: followers, views, engagement, top posts |
| | Get Account Analytics | Latest analytics for one account, with per-post metrics |
| | Get Account Trends | Daily views, likes, comments, shares and followers for 1 to 365 days |
| **Workspace** | Get, Get Many | Look up workspaces and their IDs |
| **Social Account** | Get, Get Many | Look up connected accounts by platform or name |

### Creating posts

- **Media** can come from three places, combined in this order:
  - **Input Binary Fields:** files from a previous node, such as HTTP Request, Google Drive or Dropbox. The default field name is `data`.
  - **Media URLs:** public links that PostPlanify downloads.
  - **Existing Media IDs:** from the Upload operation or your PostPlanify media library.
- Files can be JPEG, PNG, GIF, WebP, MP4, MOV or PDF (LinkedIn), up to 100 MB each. Instagram, TikTok, YouTube and Pinterest posts need media.
- **Publish At** is optional. Leave it empty to publish in about 5 minutes. Times picked in the date picker use the workflow's time zone (**Workflow Settings > Timezone**); times from expressions can include an offset, e.g. `2026-11-03T09:00:00+02:00`.
- **Platform Settings** holds options for each network: YouTube title and tags, TikTok privacy and disclosures, Pinterest board and link, Google Business events, offers and buttons, X communities and tags, and Instagram or Facebook Stories. Only the settings for the selected account's platform are sent, so one node can post to any account.

**Get** and **Get Many** for posts and comments return a simplified record with the 10 most useful fields. Turn off **Simplify** to get the full API response.

## Trigger

The **PostPlanify Trigger** node checks PostPlanify on the schedule you set and starts the workflow for each new item:

- **New Scheduled Post:** a post is scheduled in a workspace.
- **New Published Post:** a post goes live on a social network.
- **New Comment:** a new comment on Facebook, Instagram or LinkedIn, or a new Google Business review.

Each can be narrowed to one social account or platform. When the workflow is activated, existing items are skipped, so it only fires for items that arrive after that.

## Example workflows

**Post new blog articles to LinkedIn and X**

1. **RSS Feed Trigger** on your blog feed.
2. **PostPlanify > Post > Create** for your LinkedIn page, with the caption `{{ $json.title }} {{ $json.link }}`.
3. A second **PostPlanify > Post > Create** for your X account.

**Publish images from Google Drive to Instagram**

1. **Google Drive Trigger** on a folder (file created).
2. **Google Drive > Download** the file. It arrives in the binary field `data`.
3. **PostPlanify > Post > Create** for your Instagram account. Keep **Input Binary Fields** as `data` and set the caption from the file name or a spreadsheet.

**Reply to new comments with AI**

1. **PostPlanify Trigger > New Comment** for a workspace.
2. An **OpenAI** or **AI Agent** node that drafts a reply from `{{ $json.text }}`.
3. **PostPlanify > Comment > Reply** with **Comment ID** `{{ $('PostPlanify Trigger').item.json.id }}`.

Add a **Wait** or **Slack** approval step between drafting and replying if a person should check replies first.

## Using PostPlanify from an AI agent

The PostPlanify node can be used as a tool by the n8n **AI Agent** node, so an agent can schedule posts, read analytics and reply to comments.

PostPlanify also has a hosted [MCP server](https://postplanify.com/mcp) with 22 tools. To use it from n8n, add an **MCP Client Tool** node to your AI Agent and point it at `https://api.postplanify.com/api/mcp`, authenticating with your API key as a bearer token.

## Compatibility

Built with the n8n node CLI and tested on n8n 2.x.

## Resources

- [PostPlanify](https://postplanify.com)
- [PostPlanify API documentation](https://postplanify.com/docs)
- [PostPlanify MCP server](https://postplanify.com/mcp)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)

## License

[MIT](LICENSE.md)
