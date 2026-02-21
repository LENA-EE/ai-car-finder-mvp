# VIN Decoder MCP Server Setup

This guide explains how to set up the VIN Decoder MCP Server for use with Claude Desktop.

## What is MCP?

MCP (Model Context Protocol) allows Claude to interact with external tools and data sources. The VIN Decoder MCP Server provides Claude with tools to:

- **decode_vin** - Decode VIN to get manufacturer, country, year
- **validate_vin** - Check if VIN format is valid
- **check_vin_history** - Check vehicle history (pledges, accidents, restrictions)

## Prerequisites

1. Claude Desktop installed
2. Node.js 18+ installed
3. This repository cloned locally

## Installation

### 1. Install dependencies

```bash
cd backend/mcp-server
npm install
```

### 2. Configure Claude Desktop

Edit your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

Add the VIN Decoder server:

```json
{
  "mcpServers": {
    "vin-decoder": {
      "command": "node",
      "args": ["/full/path/to/backend/mcp-server/index.js"],
      "env": {
        "DATABASE_URL": "your-database-url",
        "FNP_MOCK": "true"
      }
    }
  }
}
```

Replace `/full/path/to` with your actual path to the repository.

### 3. Restart Claude Desktop

After updating the config, restart Claude Desktop to load the MCP server.

## Usage Examples

Once configured, you can ask Claude:

### Decode a VIN

> "Расшифруй VIN WBAPH5C55BA123456"

Claude will use the `decode_vin` tool and respond with:
- Brand: BMW
- Country: Germany
- Year: 2011
- Manufacturer: BMW AG

### Validate a VIN

> "Проверь правильность VIN X9FMXXEEBMCG12345"

Claude will use the `validate_vin` tool and confirm if the format is correct.

### Check Vehicle History

> "Проверь историю автомобиля по VIN WBAPH5C55BA123456"

Claude will use the `check_vin_history` tool to check:
- Pledges (ФНП registry)
- Accidents (ГИБДД) - requires API key
- Restrictions (ФССП) - requires API key

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | For WMI lookup |
| `FNP_MOCK` | Set to "true" for mock FNP responses | For testing |
| `RUCAPTCHA_API_KEY` | RuCaptcha API key for ГИБДД | Optional |
| `FSSP_API_TOKEN` | ФССП API token | Optional |

## Troubleshooting

### MCP server not appearing in Claude

1. Check the config file syntax (valid JSON)
2. Verify the path to `index.js` is correct
3. Check Claude Desktop logs for errors

### Database errors

Ensure `DATABASE_URL` is set and the database has the `vin_wmi` table populated.

### FNP check fails

The FNP API (reestr-zalogov.ru) is only accessible from Russian IPs. Set `FNP_MOCK=true` for testing outside Russia.

## Development

To test the MCP server locally:

```bash
cd backend/mcp-server
node index.js
```

The server communicates via stdio, so you'll see logs on stderr.
