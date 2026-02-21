#!/usr/bin/env node
/**
 * VIN Decoder MCP Server
 *
 * Provides Claude with tools to decode VINs and check vehicle history.
 * Run with: node index.js
 *
 * Claude Desktop config (~/.config/claude/claude_desktop_config.json):
 * {
 *   "mcpServers": {
 *     "vin-decoder": {
 *       "command": "node",
 *       "args": ["/path/to/backend/mcp-server/index.js"]
 *     }
 *   }
 * }
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { decodeVin, validateVin, checkVinHistory } from './tools/vin-tools.js';

// Create MCP server
const server = new Server(
  {
    name: 'vin-decoder',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
const TOOLS = [
  {
    name: 'decode_vin',
    description:
      'Декодирует VIN номер автомобиля и возвращает информацию о производителе, стране, годе выпуска. Decodes a VIN (Vehicle Identification Number) and returns manufacturer, country, year information.',
    inputSchema: {
      type: 'object',
      properties: {
        vin: {
          type: 'string',
          description: 'VIN номер (17 символов). Пример: WBAPH5C55BA123456',
        },
      },
      required: ['vin'],
    },
  },
  {
    name: 'validate_vin',
    description:
      'Проверяет корректность VIN номера по стандарту ISO 3779. Validates VIN format according to ISO 3779 standard.',
    inputSchema: {
      type: 'object',
      properties: {
        vin: {
          type: 'string',
          description: 'VIN номер для проверки',
        },
      },
      required: ['vin'],
    },
  },
  {
    name: 'check_vin_history',
    description:
      'Проверяет историю автомобиля по VIN: залоги (ФНП), ДТП (ГИБДД), ограничения (ФССП). Checks vehicle history by VIN: pledges, accidents, restrictions. Note: ГИБДД and ФССП require API keys.',
    inputSchema: {
      type: 'object',
      properties: {
        vin: {
          type: 'string',
          description: 'VIN номер автомобиля',
        },
        sources: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['gibdd', 'fnp', 'fssp'],
          },
          description:
            'Источники для проверки. По умолчанию: все доступные. gibdd - ГИБДД (ДТП, владельцы), fnp - ФНП (залоги), fssp - ФССП (ограничения)',
        },
      },
      required: ['vin'],
    },
  },
];

// Handle list_tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      case 'decode_vin':
        result = await decodeVin(args.vin);
        break;

      case 'validate_vin':
        result = await validateVin(args.vin);
        break;

      case 'check_vin_history':
        result = await checkVinHistory(args.vin, args.sources);
        break;

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Run server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('VIN Decoder MCP Server running on stdio');
}

main().catch(console.error);
