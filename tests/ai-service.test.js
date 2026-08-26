const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('AI-Service Test Suite', () => {
  describe('Tool Definitions & Schema Integrity', () => {
    const { TOOL_DEFINITIONS } = require('../services/AI-Service/src/tools/tool-definitions');

    it('should declare all core ecommerce tools with valid function schemas', () => {
      const expectedTools = [
        'searchProducts',
        'getProduct',
        'getInventory',
        'getCart',
        'getUserOrders',
        'getOrderDetails',
        'getPaymentDetails'
      ];

      const declaredNames = TOOL_DEFINITIONS.map(t => t.function.name);
      for (const tool of expectedTools) {
        assert.ok(declaredNames.includes(tool), `Missing tool definition: ${tool}`);
      }
    });

    it('should declare proper parameter types for each tool', () => {
      for (const tool of TOOL_DEFINITIONS) {
        assert.strictEqual(tool.type, 'function');
        assert.ok(tool.function.name);
        assert.ok(tool.function.description);
        assert.strictEqual(tool.function.parameters.type, 'object');
        assert.ok(tool.function.parameters.properties);
      }
    });
  });

  describe('Offline Mock Response Generator', () => {
    const LLMProvider = require('../services/AI-Service/src/provider/llm-provider');
    const provider = new LLMProvider({ apiKey: '' });

    it('should generate fallback product search tool call when searching items', async () => {
      const messages = [
        { role: 'user', content: 'Find me some laptops under 1000 dollars' }
      ];
      const { TOOL_DEFINITIONS } = require('../services/AI-Service/src/tools/tool-definitions');

      const response = await provider.chatCompletion({
        messages,
        tools: TOOL_DEFINITIONS
      });

      assert.strictEqual(response.isMock, true);
      assert.ok(response.toolCalls && response.toolCalls.length > 0);
      assert.strictEqual(response.toolCalls[0].function.name, 'searchProducts');
    });

    it('should synthesize natural language response after receiving tool results', async () => {
      const messages = [
        { role: 'user', content: 'Find me a gaming laptop' },
        {
          role: 'assistant',
          tool_calls: [{ id: 'call_1', function: { name: 'searchProducts', arguments: '{}' } }]
        },
        {
          role: 'tool',
          tool_call_id: 'call_1',
          name: 'searchProducts',
          content: JSON.stringify({
            products: [{ name: 'Apex Predator 15', price: 1299, category: 'Laptops', stock: 12 }]
          })
        }
      ];

      const response = await provider.chatCompletion({ messages });
      assert.strictEqual(response.isMock, true);
      assert.ok(response.content.includes('Apex Predator 15'));
      assert.ok(response.content.includes('$1299'));
    });
  });
});
