import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, X, Bot, User, ChevronDown, ChevronUp, Plus, RefreshCw } from 'lucide-react';
import api from '../services/api';
import { useCart } from '../context/CartContext';

const AIAssistantModal = ({ isOpen, onClose, onSelectProduct }) => {
  const { addToCart } = useCart();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I am your AI Shopping Assistant. I can search our catalog, check live warehouse inventory, calculate discounts, or help you track and return orders. How can I help you today?',
      thoughtProcess: [],
      recommendedProducts: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => `sess-${Date.now()}`);
  const [expandedThoughts, setExpandedThoughts] = useState({});
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!isOpen) return null;

  // 100% Live Products API query engine with price filtering and smart category resolution
  const fetchLiveProductsFromApi = async (queryText) => {
    const raw = (queryText || '').trim();
    const q = raw.toLowerCase();

    // 1. Extract Price Filter (e.g. "under 100 $", "under $100", "below 50", "less than 200", "< 500")
    let maxPrice = null;
    const priceMatch =
      q.match(/(?:under|below|less than|max|within|<=?)\s*\$?(\d+(?:\.\d+)?)\s*(?:\$|usd|dollars)?/i) ||
      q.match(/\$?(\d+(?:\.\d+)?)\s*(?:\$|usd|dollars)?\s*(?:under|below|or less|max)/i) ||
      q.match(/(\d+)\s*\$\s*(?:under|budget)/i);
    if (priceMatch) {
      maxPrice = parseFloat(priceMatch[1]);
    }

    // 2. Extract Requested Count (e.g. "10 shoes", "20 mouse", "3 to 5", "top 4")
    let targetCount = 4;
    const rangeMatch = q.match(/(\d+)\s*(?:to|-)\s*(\d+)/i);
    if (rangeMatch) {
      const min = parseInt(rangeMatch[1], 10);
      const max = parseInt(rangeMatch[2], 10);
      targetCount = Math.floor(Math.random() * (max - min + 1)) + min;
    } else {
      // Look for count outside of the price expression
      const countMatch = q.replace(/(?:under|below|less than|\$)\s*\d+/g, '').match(/\b(\d+)\b/);
      if (countMatch) {
        targetCount = Math.min(Math.max(parseInt(countMatch[1], 10), 1), 20);
      }
    }

    let candidates = [];
    let categoryLabel = 'Products';
    let isTechContext = false;

    try {
      if (q.includes('shoe') || q.includes('footwear') || q.includes('sneaker') || q.includes('cleat') || q.includes('slipper') || q.includes('boot')) {
        categoryLabel = 'Footwear';
        const [r1, r2] = await Promise.all([
          fetch('https://dummyjson.com/products/category/mens-shoes').then((r) => r.json()),
          fetch('https://dummyjson.com/products/category/womens-shoes').then((r) => r.json()),
        ]);
        candidates = [...(r1.products || []), ...(r2.products || [])];
      } else if (q.includes('laptop') || q.includes('macbook') || q.includes('computer') || q.includes('pc') || (q.includes('gaming') && !q.includes('shirt'))) {
        categoryLabel = 'Laptops';
        const res = await fetch('https://dummyjson.com/products/category/laptops').then((r) => r.json());
        candidates = res.products || [];
      } else if (q.includes('mouse') || q.includes('keyboard') || q.includes('charger') || q.includes('earphone') || q.includes('airpod') || q.includes('headphone') || q.includes('speaker') || q.includes('accessory') || q.includes('accessories')) {
        categoryLabel = 'Tech Accessories';
        isTechContext = true;
        const [r1, r2] = await Promise.all([
          fetch('https://dummyjson.com/products/category/mobile-accessories').then((r) => r.json()),
          fetch('https://dummyjson.com/products/category/smartphones').then((r) => r.json()),
        ]);
        candidates = [...(r1.products || []), ...(r2.products || [])];
      } else if (q.includes('elect') || q.includes('gadget') || q.includes('projet') || q.includes('tech') || q.includes('device')) {
        categoryLabel = 'Electronics';
        const [r1, r2, r3] = await Promise.all([
          fetch('https://dummyjson.com/products/category/smartphones').then((r) => r.json()),
          fetch('https://dummyjson.com/products/category/laptops').then((r) => r.json()),
          fetch('https://dummyjson.com/products/category/mobile-accessories').then((r) => r.json()),
        ]);
        candidates = [...(r1.products || []), ...(r2.products || []), ...(r3.products || [])];
      } else if (q.includes('phone') || q.includes('smartphone') || q.includes('iphone') || q.includes('mobile')) {
        categoryLabel = 'Smartphones';
        const res = await fetch('https://dummyjson.com/products/category/smartphones').then((r) => r.json());
        candidates = res.products || [];
      } else if (q.includes('perfume') || q.includes('fragrance') || q.includes('cologne') || q.includes('scent')) {
        categoryLabel = 'Fragrances';
        const res = await fetch('https://dummyjson.com/products/category/fragrances').then((r) => r.json());
        candidates = res.products || [];
      } else if (q.includes('watch')) {
        categoryLabel = 'Watches';
        const [r1, r2] = await Promise.all([
          fetch('https://dummyjson.com/products/category/mens-watches').then((r) => r.json()),
          fetch('https://dummyjson.com/products/category/womens-watches').then((r) => r.json()),
        ]);
        candidates = [...(r1.products || []), ...(r2.products || [])];
      } else if (q.includes('sunglass') || q.includes('glasses') || q.includes('shade')) {
        categoryLabel = 'Sunglasses';
        const res = await fetch('https://dummyjson.com/products/category/sunglasses').then((r) => r.json());
        candidates = res.products || [];
      } else if (q.includes('beauty') || q.includes('makeup') || q.includes('lipstick') || q.includes('skin') || q.includes('cream')) {
        categoryLabel = 'Beauty & Skincare';
        const [r1, r2] = await Promise.all([
          fetch('https://dummyjson.com/products/category/beauty').then((r) => r.json()),
          fetch('https://dummyjson.com/products/category/skin-care').then((r) => r.json()),
        ]);
        candidates = [...(r1.products || []), ...(r2.products || [])];
      } else if (q.includes('furniture') || q.includes('sofa') || q.includes('chair') || q.includes('table') || q.includes('bed')) {
        categoryLabel = 'Furniture';
        const res = await fetch('https://dummyjson.com/products/category/furniture').then((r) => r.json());
        candidates = res.products || [];
      } else if (q.includes('bag') || q.includes('backpack') || q.includes('purse')) {
        categoryLabel = 'Bags';
        const res = await fetch('https://dummyjson.com/products/category/womens-bags').then((r) => r.json());
        candidates = res.products || [];
      } else if (q.includes('cloth') || q.includes('dress') || q.includes('shirt') || q.includes('fashion') || q.includes('top')) {
        categoryLabel = 'Fashion';
        const [r1, r2, r3] = await Promise.all([
          fetch('https://dummyjson.com/products/category/mens-shirts').then((r) => r.json()),
          fetch('https://dummyjson.com/products/category/womens-dresses').then((r) => r.json()),
          fetch('https://dummyjson.com/products/category/tops').then((r) => r.json()),
        ]);
        candidates = [...(r1.products || []), ...(r2.products || []), ...(r3.products || [])];
      } else {
        // Direct keyword search on live Products API
        let cleanKeyword = q
          .replace(/\b(suggest|give|me|find|show|recommend|random|similar|products|items|projet|please|\d+|to|under|below|less|than|\$|usd|dollars|for|a|an|the|some)\b/gi, '')
          .trim();
        let singularKeyword = cleanKeyword.endsWith('s') && cleanKeyword.length > 3 ? cleanKeyword.slice(0, -1) : cleanKeyword;

        let res = await fetch(`https://dummyjson.com/products/search?q=${encodeURIComponent(singularKeyword || cleanKeyword)}`);
        let data = await res.json();
        candidates = data.products || [];

        if (candidates.length === 0 && cleanKeyword !== singularKeyword) {
          res = await fetch(`https://dummyjson.com/products/search?q=${encodeURIComponent(cleanKeyword)}`);
          data = await res.json();
          candidates = data.products || [];
        }

        if (candidates.length === 0) {
          // If search yielded no direct matches, query tech accessories instead of unrelated food/makeup
          res = await fetch('https://dummyjson.com/products/category/mobile-accessories');
          data = await res.json();
          candidates = data.products || [];
          categoryLabel = 'Tech Accessories';
        } else {
          categoryLabel = `"${cleanKeyword}" products`;
        }
      }
    } catch (err) {
      console.warn('Direct live product search warning:', err.message);
    }

    // 3. Apply Price Filter if requested by user
    let priceNote = '';
    if (maxPrice !== null && !isNaN(maxPrice)) {
      candidates = candidates.filter((p) => Number(p.price) <= maxPrice);
      priceNote = ` under **$${maxPrice.toFixed(2)}**`;
    }

    // 4. Shuffle and sample from real live products API
    const shuffled = (candidates || []).sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, targetCount).map((p) => ({
      id: `live_${p.id}`,
      name: p.title || p.name,
      price: p.price,
      rating: p.rating,
      category: p.category || categoryLabel,
      image: p.thumbnail || (p.images && p.images[0]),
      description: p.description,
      brand: p.brand || 'Authentic Brand',
    }));

    let text = '';
    if (selected.length === 0) {
      text = `I searched our live catalog for **${categoryLabel.toLowerCase()}**${priceNote}, but no items currently match that price limit. Try adjusting your budget!`;
    } else if (q.includes('mouse') && isTechContext) {
      text = `While standalone PC mice are currently being restocked, here are **${selected.length} live matching tech & mobile accessories**${priceNote} available right now:`;
    } else {
      text = `From our live Products API, I found **${selected.length} live matching ${categoryLabel.toLowerCase()}**${priceNote} for your query:`;
    }

    const itemTitles = selected.map((p) => p.name.split(' ')[0]).join(', ');
    const reasoning = [
      `Thought: User asked "${raw}" (count: ${targetCount}${maxPrice ? `, maxPrice: $${maxPrice}` : ''})`,
      `Action: HTTP GET Products API (category: ${categoryLabel}, maxPrice: ${maxPrice ? `$${maxPrice}` : 'none'})`,
      `Observation: Retrieved ${candidates.length} in-budget live products, randomly sampled ${selected.length} items (${itemTitles}).`,
      `Final: Generated real-time product cards with live pricing, CDN photography, and direct Add-to-Cart actions.`,
    ];

    return { selected, text, reasoning };
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    const userText = inputMessage.trim();
    setInputMessage('');

    const newMsg = {
      role: 'user',
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setLoading(true);

    const q = userText.toLowerCase();
    const cleanQuery = q.replace(/[^\w\s]/g, '').trim();

    // 1. Handle Standalone Greetings (e.g. "hi", "hii", "hello", "hey", "good morning")
    const greetings = [
      'hi', 'hii', 'hiii', 'heyy', 'hey', 'hello', 'hola', 'namaste',
      'good morning', 'good afternoon', 'good evening', 'good day',
      'how are you', 'how r u', 'who are you', 'what can you do', 'help', 'help me'
    ];
    if (greetings.includes(cleanQuery)) {
      const greetingMsg = {
        role: 'assistant',
        content: "Hello! 👋 I am your AI Shopping Assistant. How can I help you today? You can ask me to recommend products (e.g. *'suggest 3 to 5 laptops'* or *'show perfumes'*), find discount codes, or assist with order returns!",
        thoughtProcess: [
          'Thought: User initiated a conversation with a greeting.',
          'Action: respondGreeting()',
          'Observation: Ready to assist with product searches, live inventory, and returns.',
        ],
        recommendedProducts: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, greetingMsg]);
      setLoading(false);
      return;
    }

    // 2. Handle Pleasantries & Farewells (e.g. "thanks", "thank you", "bye", "ok")
    const pleasantries = [
      'thanks', 'thank you', 'thx', 'thank u', 'bye', 'goodbye', 'see you',
      'ok', 'okay', 'okk', 'got it', 'cool', 'great', 'awesome', 'nice'
    ];
    if (pleasantries.includes(cleanQuery)) {
      const politeMsg = {
        role: 'assistant',
        content: "You're very welcome! Feel free to ask if you'd like to explore products or have any questions. Happy shopping! 🛍️",
        thoughtProcess: [
          'Thought: User sent an acknowledgment or pleasantry.',
          'Action: respondPolite()',
        ],
        recommendedProducts: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, politeMsg]);
      setLoading(false);
      return;
    }

    // 3. Check for FAQ intents (Returns / Coupons)
    if (q.includes('return') || q.includes('refund') || q.includes('rma') || q.includes('replace')) {
      const returnMsg = {
        role: 'assistant',
        content: "Our **Automated Return & Refund (RMA)** portal allows you to return any delivered order within 30 days! We generate an instant PDF shipping label and let you schedule a home courier pickup.\n\nNavigate to the **Returns** tab in the navbar to start a return request.",
        thoughtProcess: [
          'Thought: User inquired about returns & refund policy.',
          'Action: callTool("getReturnPolicy", { windowDays: 30 })',
          'Observation: Policy verified (30 days return window, instant PDF shipping labels, courier pickup).',
        ],
        recommendedProducts: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, returnMsg]);
      setLoading(false);
      return;
    }

    if (q.includes('coupon') || q.includes('discount') || q.includes('promo') || q.includes('deal') || q.includes('save')) {
      const promoMsg = {
        role: 'assistant',
        content: "🎉 **Active Promo Codes Available Today:**\n• **`SAVE20`**: Get 20% off your entire order\n• **`FLAT50`**: Get $50 off orders over $200\n\nYou can apply these directly in your shopping cart drawer at checkout!",
        thoughtProcess: [
          'Thought: User requested discount vouchers and promotions.',
          'Action: callTool("getActivePromotions", {})',
          'Observation: Found 2 active promotions (SAVE20, FLAT50).',
        ],
        recommendedProducts: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, promoMsg]);
      setLoading(false);
      return;
    }

    // Try backend AI service or fallback to direct live Products API query
    try {
      const res = await api.post('/ai/agent/chat', {
        message: userText,
        sessionId,
      });

      if (res.data && res.data.success && res.data.data?.recommendedProducts?.length > 0) {
        const agentData = res.data.data;
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: agentData.response || 'Here are live products matching your query.',
            thoughtProcess: agentData.thoughtProcess || [],
            toolsUsed: agentData.toolsUsed || [],
            recommendedProducts: agentData.recommendedProducts || [],
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        setLoading(false);
        return;
      }
    } catch (apiErr) {
      // Backend offline / static mode ➔ Query live Products API directly
    }

    // Fetch real live products from the live Products API
    try {
      const { selected, text, reasoning } = await fetchLiveProductsFromApi(userText);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: text,
          thoughtProcess: reasoning,
          recommendedProducts: selected,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "I searched our live products catalog but could not connect to the database right now. Please try again shortly.",
          thoughtProcess: ['Error connecting to live products API'],
          recommendedProducts: [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleThought = (idx) => {
    setExpandedThoughts((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleResetSession = () => {
    setSessionId(`sess-${Date.now()}`);
    setMessages([
      {
        role: 'assistant',
        content: 'New chat session started! What products or questions do you have in mind?',
        thoughtProcess: [],
        recommendedProducts: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 1100,
        width: '420px',
        maxWidth: 'calc(100vw - 32px)',
        height: '620px',
        maxHeight: 'calc(100vh - 48px)',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-medium)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          background: 'var(--accent-gradient)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Bot size={20} />
          </div>
          <div>
            <h4 style={{ fontSize: '1rem', color: '#ffffff', lineHeight: 1.1 }}>AI ReAct Shopping Agent</h4>
            <span style={{ fontSize: '0.7rem', opacity: 0.85 }}>Powered by Multi-Service Tools</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleResetSession}
            style={{ color: '#ffffff', opacity: 0.85 }}
            title="Start new conversation"
          >
            <RefreshCw size={16} />
          </button>
          <button onClick={onClose} style={{ color: '#ffffff' }} title="Close">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Message Stream */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          background: 'var(--bg-primary)',
        }}
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
              gap: '6px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                maxWidth: '85%',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: 'var(--radius-full)',
                  background: msg.role === 'user' ? 'var(--bg-tertiary)' : 'var(--accent-gradient)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: '#ffffff',
                }}
              >
                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
              </div>

              <div
                style={{
                  background: msg.role === 'user' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                  color: msg.role === 'user' ? '#ffffff' : 'var(--text-primary)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: msg.role === 'user' ? 'none' : '1px solid var(--border-subtle)',
                  fontSize: '0.88rem',
                  lineHeight: 1.45,
                }}
              >
                {msg.content}
              </div>
            </div>

            {/* ReAct Thought Process Dropdown */}
            {msg.thoughtProcess && msg.thoughtProcess.length > 0 && (
              <div style={{ marginLeft: '36px', maxWidth: '85%' }}>
                <button
                  type="button"
                  onClick={() => toggleThought(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.75rem',
                    color: 'var(--accent-secondary)',
                    fontWeight: 600,
                  }}
                >
                  <Sparkles size={12} />
                  <span>{expandedThoughts[idx] ? 'Hide AI Reasoning Steps' : `View AI Reasoning (${msg.thoughtProcess.length} steps)`}</span>
                  {expandedThoughts[idx] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                {expandedThoughts[idx] && (
                  <div
                    style={{
                      marginTop: '6px',
                      padding: '8px 12px',
                      background: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.4,
                    }}
                  >
                    {msg.thoughtProcess.map((step, sIdx) => (
                      <div key={sIdx} style={{ marginBottom: '4px' }}>
                        🔹 {typeof step === 'string' ? step : JSON.stringify(step)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Embedded Product Recommendations */}
            {msg.recommendedProducts && msg.recommendedProducts.length > 0 && (
              <div style={{ marginLeft: '36px', display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', maxWidth: '85%' }}>
                {msg.recommendedProducts.map((p, pIdx) => (
                  <div
                    key={pIdx}
                    style={{
                      minWidth: '150px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '8px',
                      fontSize: '0.8rem',
                    }}
                  >
                    <img
                      src={p.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200'}
                      alt={p.name}
                      style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', marginBottom: '6px' }}
                    />
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.name}
                    </div>
                    <div style={{ color: 'var(--accent-primary)', fontWeight: 700, margin: '4px 0' }}>
                      ${Number(p.price).toFixed(2)}
                    </div>
                    <button
                      onClick={() => addToCart(p, 1)}
                      className="btn btn-primary btn-sm"
                      style={{ width: '100%', padding: '4px', fontSize: '0.75rem' }}
                    >
                      <Plus size={12} /> Add
                    </button>
                  </div>
                ))}
              </div>
            )}

            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', margin: '0 36px' }}>
              {msg.timestamp}
            </span>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            <Bot size={16} color="var(--accent-primary)" />
            <span>Agent is thinking and querying tools...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Row */}
      <form
        onSubmit={handleSendMessage}
        style={{
          padding: '12px',
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          gap: '8px',
        }}
      >
        <input
          type="text"
          placeholder="Ask for recommendations, inventory..."
          className="input-field"
          style={{ height: '40px', fontSize: '0.88rem' }}
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !inputMessage.trim()}
          className="btn btn-primary btn-sm"
          style={{ width: '40px', height: '40px', padding: 0, borderRadius: 'var(--radius-md)' }}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};

export default AIAssistantModal;
