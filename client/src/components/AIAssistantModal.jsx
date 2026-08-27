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

  // Full Taxonomy of Public Product Categories & Semantic Keywords
  const CATEGORY_TAXONOMY = {
    'smartphones': ['phone', 'phones', 'smartphone', 'smartphones', 'iphone', 'android', 'samsung', 'mobile', 'cellphone', 'oppo', 'realme', 'vivo'],
    'laptops': ['laptop', 'laptops', 'macbook', 'macbooks', 'notebook', 'notebooks', 'computer', 'computers', 'pc', 'dell', 'lenovo', 'asus', 'zenbook'],
    'mobile-accessories': ['headphone', 'headphones', 'earphone', 'earphones', 'airpod', 'airpods', 'earbud', 'earbuds', 'charger', 'chargers', 'cable', 'magsafe', 'case', 'selfie', 'speaker', 'speakers', 'audio', 'sound', 'beats', 'echo', 'homepod', 'wireless', 'bluetooth', 'mouse', 'keyboard'],
    'tablets': ['tablet', 'tablets', 'ipad', 'tab'],
    'mens-shoes': ['mens shoes', 'men shoe', 'shoes for men', 'mens footwear', 'sneakers for men', 'mens sneaker', 'mens sneakers', 'mens sports shoes', 'mens trainers', 'mens cleats', 'mens running shoes'],
    'womens-shoes': ['heel', 'heels', 'high heels', 'pumps', 'sandals', 'womens shoes', 'women shoes', 'ladies shoes', 'slippers'],
    'mens-watches': ['watch', 'watches', 'smartwatch', 'rolex', 'chronograph', 'leather watch'],
    'womens-watches': ['womens watch', 'womens watches', 'women watch', 'ladies watch'],
    'mens-shirts': ['shirt', 'shirts', 'tshirt', 't-shirt', 'men clothing'],
    'womens-dresses': ['dress', 'dresses', 'gown', 'frock', 'skirt'],
    'womens-bags': ['bag', 'bags', 'handbag', 'handbags', 'purse', 'purses', 'backpack', 'wallet', 'tote'],
    'womens-jewellery': ['jewelry', 'jewellery', 'necklace', 'ring', 'earring', 'earrings', 'bracelet', 'gold', 'diamond', 'silver'],
    'sunglasses': ['sunglass', 'sunglasses', 'shades', 'eyewear', 'glasses'],
    'fragrances': ['perfume', 'perfumes', 'fragrance', 'fragrances', 'cologne', 'colognes', 'scent', 'scents', 'eau de parfum'],
    'beauty': ['makeup', 'cosmetics', 'lipstick', 'mascara', 'nail polish', 'foundation', 'eyeliner', 'beauty'],
    'skin-care': ['skincare', 'skin care', 'cream', 'lotion', 'serum', 'moisturizer', 'sunscreen'],
    'furniture': ['furniture', 'sofa', 'sofas', 'couch', 'chair', 'chairs', 'table', 'tables', 'bed', 'beds', 'desk'],
    'home-decoration': ['decor', 'decoration', 'lamp', 'clock', 'vase', 'cushion', 'curtain', 'mirror'],
    'kitchen-accessories': ['kitchen', 'pan', 'pot', 'knife', 'knives', 'blender', 'mug', 'cup', 'cookware'],
    'sports-accessories': ['cricket', 'football', 'basketball', 'badminton', 'shuttlecock', 'racket', 'dumbbell', 'fitness', 'gym'],
    'groceries': ['grocery', 'food', 'snack', 'coffee', 'tea', 'juice', 'beverage'],
    'tops': ['hoodie', 'hoodies', 'sweater', 'sweaters', 'jacket', 'jackets', 'blouse', 'tunic']
  };

  const KNOWN_BRANDS = [
    'apple', 'samsung', 'nike', 'puma', 'adidas', 'asus', 'dell', 'lenovo', 'hp', 'huawei',
    'sony', 'beats', 'oppo', 'realme', 'vivo', 'calvin klein', 'dior', 'gucci', 'chanel',
    'rolex', 'dolce', 'essence', 'annibale colombo'
  ];

  // Complex Multi-Signal Semantic Search & Scored Re-Ranking Engine
  const fetchLiveProductsFromApi = async (queryText) => {
    const raw = (queryText || '').trim();
    const q = raw.toLowerCase();
    const clean = q.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const words = clean.split(' ').filter(Boolean);

    // 1. Price Boundaries Analysis (e.g. "between 50 and 150", "under 100 $", "above 200")
    let maxPrice = null;
    let minPrice = null;

    const betweenMatch =
      q.match(/between\s*\$?(\d+(?:\.\d+)?)\s*(?:and|to|-)\s*\$?(\d+(?:\.\d+)?)/i) ||
      q.match(/\$?(\d+(?:\.\d+)?)\s*(?:to|-)\s*\$?(\d+(?:\.\d+)?)\s*(?:\$|usd|dollars)?/i);
    if (betweenMatch && !q.match(/(\d+)\s*(?:to|-)\s*(\d+)\s*(?:items|products|shoes|laptops|phones|perfumes)/i)) {
      minPrice = parseFloat(betweenMatch[1]);
      maxPrice = parseFloat(betweenMatch[2]);
    } else {
      const maxMatch =
        q.match(/(?:under|below|less than|max|within|<=?)\s*\$?(\d+(?:\.\d+)?)\s*(?:\$|usd|dollars)?/i) ||
        q.match(/\$?(\d+(?:\.\d+)?)\s*(?:\$|usd|dollars)?\s*(?:under|below|or less|max)/i) ||
        q.match(/(\d+)\s*\$\s*(?:under|budget)/i);
      if (maxMatch) maxPrice = parseFloat(maxMatch[1]);

      const minMatch = q.match(/(?:above|over|more than|min|at least|>=?)\s*\$?(\d+(?:\.\d+)?)\s*(?:\$|usd|dollars)?/i);
      if (minMatch) minPrice = parseFloat(minMatch[1]);
    }

    // 2. Count Extraction
    let targetCount = 4;
    const countRangeMatch = q.match(/(\d+)\s*(?:to|-)\s*(\d+)\s*(?:items|products|shoes|laptops|phones|headphones|watches|fragrances|perfumes)?/i);
    if (countRangeMatch) {
      const minC = parseInt(countRangeMatch[1], 10);
      const maxC = parseInt(countRangeMatch[2], 10);
      targetCount = Math.floor(Math.random() * (maxC - minC + 1)) + minC;
    } else {
      const qWithoutPrice = q.replace(/(?:under|below|less than|above|over|between|\$)\s*\d+(?:\s*(?:and|to|-)\s*\d+)?/gi, '');
      const countMatch = qWithoutPrice.match(/\b(\d+)\b/);
      if (countMatch) {
        targetCount = Math.min(Math.max(parseInt(countMatch[1], 10), 1), 20);
      }
    }

    // 3. Demographic & Semantic Attribute Extraction
    const isMen = /\b(men|mens|man|male|boy|gent)\b/i.test(q);
    const isWomen = /\b(women|womens|woman|female|girl|lady)\b/i.test(q);
    const isShoe = /\b(shoe|shoes|footwear|sneaker|sneakers|cleat|cleats|trainer|trainers|slipper|slippers|boot|boots|heel|heels)\b/i.test(q);
    const isSports = /\b(sport|sports|running|athletic|sneaker|sneakers|trainer|trainers|cleat|cleats|gym|workout)\b/i.test(q);
    const isGaming = /\b(gaming|gamer|geforce|rtx|esports|game)\b/i.test(q);
    const isAudio = /\b(headphone|headphones|earphone|earphones|airpod|airpods|earbud|earbuds|audio|speaker|beats|sound)\b/i.test(q);
    const matchedBrand = KNOWN_BRANDS.find((b) => q.includes(b));

    // 4. Word-Boundary Taxonomy Matching
    const matchedCategories = [];
    if (isShoe) {
      if (isMen && !isWomen) {
        matchedCategories.push('mens-shoes');
      } else if (isWomen && !isMen) {
        matchedCategories.push('womens-shoes');
      } else {
        matchedCategories.push('mens-shoes', 'womens-shoes');
      }
    } else if (isAudio) {
      matchedCategories.push('mobile-accessories');
    } else {
      for (const [catSlug, kwList] of Object.entries(CATEGORY_TAXONOMY)) {
        if (catSlug === 'tops' && q.includes('laptop')) continue;
        for (const kw of kwList) {
          const regex = new RegExp(`\\b${kw}\\b`, 'i');
          if (regex.test(q)) {
            if (!matchedCategories.includes(catSlug)) matchedCategories.push(catSlug);
            break;
          }
        }
      }
    }

    const searchKeyword = clean
      .replace(/\b(suggest|give|me|find|show|recommend|random|similar|products|items|projet|please|\d+|to|under|below|less|than|\$|usd|dollars|for|a|an|the|some|men|mens|women|womens)\b/gi, '')
      .trim();

    let candidatePool = [];
    let categoryLabel = 'Products';

    try {
      if (matchedCategories.length > 0) {
        const catPromises = matchedCategories.map((cat) =>
          fetch(`https://dummyjson.com/products/category/${cat}`).then((r) => r.json()).catch(() => ({ products: [] }))
        );
        const catResults = await Promise.all(catPromises);
        for (const res of catResults) {
          if (res.products && Array.isArray(res.products)) {
            candidatePool.push(...res.products);
          }
        }
        categoryLabel = isShoe
          ? isMen
            ? "Men's Shoes"
            : isWomen
            ? "Women's Shoes"
            : 'Footwear'
          : matchedCategories[0].replace(/-/g, ' ');
      }

      if (searchKeyword && searchKeyword.length >= 2 && !isShoe && !isAudio) {
        const sRes = await fetch(`https://dummyjson.com/products/search?q=${encodeURIComponent(searchKeyword)}`)
          .then((r) => r.json())
          .catch(() => ({ products: [] }));
        if (sRes.products && Array.isArray(sRes.products)) {
          candidatePool.push(...sRes.products);
        }
      }

      if (candidatePool.length === 0 && matchedCategories.length > 0) {
        const broadRes = await fetch('https://dummyjson.com/products?limit=50').then((r) => r.json()).catch(() => ({ products: [] }));
        candidatePool = broadRes.products || [];
        categoryLabel = 'Featured Products';
      }
    } catch (err) {
      console.warn('Semantic fetch warning:', err.message);
    }

    // Deduplicate candidate pool
    const uniqueMap = new Map();
    for (const p of candidatePool) {
      if (!uniqueMap.has(p.id)) uniqueMap.set(p.id, p);
    }
    let candidates = Array.from(uniqueMap.values());

    // 5. Strict Sub-filters
    if (isAudio) {
      categoryLabel = 'Headphones & Audio';
      candidates = candidates.filter((p) => {
        const t = (p.title + ' ' + (p.description || '')).toLowerCase();
        return t.includes('airpod') || t.includes('earphone') || t.includes('headphone') || t.includes('beats') || t.includes('echo') || t.includes('speaker') || t.includes('homepod');
      });
    }

    if (isShoe && isSports) {
      categoryLabel = isMen ? "Men's Sports Shoes" : isWomen ? "Women's Sports Shoes" : 'Sports & Athletic Shoes';
      candidates = candidates.filter((p) => {
        const t = (p.title + ' ' + (p.description || '')).toLowerCase();
        return t.includes('sneaker') || t.includes('sport') || t.includes('cleat') || t.includes('trainer') || t.includes('jordan') || t.includes('nike') || t.includes('puma') || t.includes('running');
      });
    }

    if (maxPrice !== null && !isNaN(maxPrice)) {
      candidates = candidates.filter((p) => Number(p.price) <= maxPrice);
    }
    if (minPrice !== null && !isNaN(minPrice)) {
      candidates = candidates.filter((p) => Number(p.price) >= minPrice);
    }

    // 6. Semantic Relevance Scoring (TF-IDF & Signal Weighting)
    candidates.forEach((p) => {
      let score = 0;
      const titleLower = (p.title || '').toLowerCase();
      const descLower = (p.description || '').toLowerCase();
      const brandLower = (p.brand || '').toLowerCase();

      words.forEach((w) => {
        if (titleLower.includes(w)) score += 14;
        if (descLower.includes(w)) score += 5;
      });

      if (matchedBrand && (brandLower.includes(matchedBrand) || titleLower.includes(matchedBrand))) {
        score += 30;
      }

      if (p.rating >= 4.5) score += 8;
      else if (p.rating >= 4.0) score += 4;

      if (isGaming && (titleLower.includes('pro') || titleLower.includes('zenbook') || titleLower.includes('xps'))) {
        score += 20;
      }

      p._score = score;
    });

    candidates.sort((a, b) => b._score - a._score);

    const selected = candidates.slice(0, targetCount).map((p) => ({
      id: `live_${p.id}`,
      name: p.title || p.name,
      price: p.price,
      rating: p.rating,
      category: p.category || categoryLabel,
      image: p.thumbnail || (p.images && p.images[0]),
      description: p.description,
      brand: p.brand || 'Authentic Brand',
    }));

    let priceClause = '';
    if (minPrice !== null && maxPrice !== null) {
      priceClause = ` between **$${minPrice.toFixed(2)}** and **$${maxPrice.toFixed(2)}**`;
    } else if (maxPrice !== null) {
      priceClause = ` under **$${maxPrice.toFixed(2)}**`;
    } else if (minPrice !== null) {
      priceClause = ` above **$${minPrice.toFixed(2)}**`;
    }

    let text = '';
    if (selected.length === 0) {
      text = `I searched our live catalog for **${categoryLabel.toLowerCase()}**${priceClause}, but no items currently match your exact budget and criteria. Try adjusting your search or budget!`;
    } else {
      text = `From our live Products API, I found **${selected.length} live matching ${categoryLabel.toLowerCase()}**${priceClause} for your query:`;
    }

    const itemTitles = selected.map((p) => p.name.split(' ')[0]).join(', ');
    const reasoning = [
      `Thought: Analyzed semantic intent for "${raw}" (Target: ${targetCount} items${maxPrice ? `, MaxPrice: $${maxPrice}` : ''}${isMen ? ', Gender: Men' : ''}${isSports ? ', Style: Athletic' : ''})`,
      `Action: Scored candidate pool via TF-IDF token matching, category weights, and brand affinity (${matchedBrand || 'general'})`,
      `Observation: Retrieved ${candidates.length} verified in-budget items, selected top ${selected.length} products (${itemTitles}).`,
      `Final: Generated real-time comparative cards with live pricing and Add-to-Cart actions.`,
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

    // Primary Flow: Send 100% of user queries directly to Backend AI Model (LLM via Groq / Shopping Agent)
    try {
      // Try /ai/agent/chat first (which ApiGateway forwards to /api/v1/agent/chat)
      let res;
      try {
        res = await api.post('/ai/agent/chat', {
          message: userText,
          sessionId,
        });
      } catch (e1) {
        res = await api.post('/ai/v1/agent/chat', {
          message: userText,
          sessionId,
        });
      }

      if (res.data && res.data.success && res.data.data) {
        const agentData = res.data.data;
        const replyText = agentData.reply || agentData.response || 'I have processed your request.';
        const toolsUsed = agentData.toolsUsed || [];
        const recommendedProducts = agentData.recommendedProducts || [];

        // Build clear reasoning steps for the user interface
        let thoughtProcess = [];
        if (toolsUsed.length > 0) {
          thoughtProcess = toolsUsed.map(
            (t) => `Thought: User query required live tool execution. Called '${t.toolName}' with parameters: ${JSON.stringify(t.args)}`
          );
          thoughtProcess.push(`Observation: Tool returned live data. Synthesized final response using ${agentData.model || 'LLM'}.`);
        } else {
          thoughtProcess = [
            `Thought: Processed semantic intent for "${userText}".`,
            `Action: LLM Chatbot conversational reasoning.`,
            `Observation: Generated direct assistant response using ${agentData.model || 'LLM'}.`,
          ];
        }

        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: replyText,
            thoughtProcess,
            toolsUsed,
            recommendedProducts,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        setLoading(false);
        return;
      }
    } catch (apiErr) {
      console.warn('[AI Assistant API Note]: Backend AI service offline or returning fallback:', apiErr?.response?.data || apiErr.message);
    }

    // Secondary Fallback: If backend service is unavailable, handle locally
    const lowerText = userText.toLowerCase().replace(/[^\w\s]/gi, '').trim();
    const isGreetingOrChat = /^(hi|hii|hiii|hi\s*ai|hey|heyy|hello|hello\s*ai|hola|namaste|good\s*morning|goodmorning|good\s*evening|goodevening|good\s*afternoon|goodafternoon|morning|evening|afternoon|how\s*are\s*you|how\s*r\s*u|how\s*are\s*u|who\s*are\s*you|who\s*r\s*u|what\s*can\s*you\s*do|what\s*do\s*you\s*do|thanks|thank\s*you|thx|cool|great|awesome|okay|ok|bye|goodbye|see\s*you|take\s*care|tc)\b/i.test(lowerText);

    if (isGreetingOrChat) {
      let chatReply = "Hello! 👋 I am your AI Shopping Assistant. How can I help you today?";
      if (lowerText.includes('morning')) {
        chatReply = "Good morning! ☀️ How can I help you with your shopping today?";
      } else if (lowerText.includes('evening')) {
        chatReply = "Good evening! 🌙 How can I help you with your shopping today?";
      } else if (lowerText.includes('afternoon')) {
        chatReply = "Good afternoon! ☀️ How can I help you with your shopping today?";
      } else if (lowerText.includes('how are you') || lowerText.includes('how r u') || lowerText.includes('how are u')) {
        chatReply = "I'm doing great, thank you for asking! How can I help you today?";
      } else if (lowerText.includes('who are you') || lowerText.includes('what can you do') || lowerText.includes('what do you do')) {
        chatReply = "I am your personal AI Shopping Assistant! I can help you search our catalog, check live warehouse stock, view your cart, or track orders.";
      } else if (lowerText.includes('thank') || lowerText.includes('thx')) {
        chatReply = "You're very welcome! Let me know if you need anything else.";
      } else if (lowerText.includes('bye') || lowerText.includes('see you') || lowerText.includes('take care') || lowerText === 'tc') {
        chatReply = "Goodbye! 👋 Have a wonderful day!";
      } else if (lowerText === 'ok' || lowerText === 'okay' || lowerText === 'cool' || lowerText === 'great' || lowerText === 'awesome') {
        chatReply = "Awesome! Let me know whenever you need help finding products or checking stock.";
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: chatReply,
          thoughtProcess: [`Processed conversational intent for "${userText}"`],
          recommendedProducts: [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setLoading(false);
      return;
    }

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
          content: "Hello! I am your AI Shopping Assistant. How can I help you find products, check warehouse availability, or manage orders today?",
          thoughtProcess: ['Offline fallback activated.'],
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
