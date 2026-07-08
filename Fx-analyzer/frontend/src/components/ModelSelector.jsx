import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, ChevronDown, Check, Sparkles, Globe } from 'lucide-react';

// Display names for each provider-prefixed model string
const MODEL_DISPLAY = {
  // OpenRouter free models
  'openrouter:google/gemma-4-31b-it:free': 'Google Gemma 4 31B (Free)',
  'openrouter:google/gemma-4-26b-a4b-it:free': 'Google Gemma 4 26B (Free)',
  'openrouter:meta-llama/llama-3.3-70b-instruct:free': 'Meta Llama 3.3 70B (Free)',
  'openrouter:meta-llama/llama-3.2-3b-instruct:free': 'Meta Llama 3.2 3B (Free)',
  'openrouter:nvidia/nemotron-3-super-120b-a12b:free': 'NVIDIA Nemotron 3 Super 120B (Free)',
  'openrouter:nvidia/nemotron-3-nano-30b-a3b:free': 'NVIDIA Nemotron 3 Nano 30B (Free)',
  'openrouter:qwen/qwen3-next-80b-a3b-instruct:free': 'Qwen Qwen3 Next 80B (Free)',
  'openrouter:qwen/qwen3-coder:free': 'Qwen Qwen3 Coder 480B (Free)',
  'openrouter:nousresearch/hermes-3-llama-3.1-405b:free': 'Nous Hermes 3 405B (Free)',
  'openrouter:poolside/laguna-m.1:free': 'Poolside Laguna M.1 (Free)',
  'openrouter:cohere/north-mini-code:free': 'Cohere North Mini Code (Free)',

  // Gemini models
  'gemini:gemini-1.5-flash': 'Gemini 1.5 Flash',
  'gemini:gemini-1.5-pro': 'Gemini 1.5 Pro',
  'gemini:gemini-2.0-flash': 'Gemini 2.0 Flash',
  'gemini:gemini-2.0-flash-lite': 'Gemini 2.0 Flash Lite',
};

function getProvider(modelStr) {
  if (modelStr.startsWith('openrouter:')) return 'openrouter';
  if (modelStr.startsWith('gemini:')) return 'gemini';
  return 'other';
}

function formatShortLabel(modelStr) {
  const display = MODEL_DISPLAY[modelStr];
  if (display) {
    // Show just the model family + size, e.g. "Gemma 4 31B" or "Llama 3.3 70B"
    const parts = display.replace('(Free)', '').trim();
    return parts;
  }
  // Fallback: show last meaningful part
  const parts = modelStr.split('/');
  return parts[parts.length - 1] || modelStr;
}

export default function ModelSelector({ socket, currentModel = 'openrouter:google/gemma-4-26b-a4b-it:free' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [models, setModels] = useState([]);
  const [selected, setSelected] = useState(currentModel);

  useEffect(() => {
    if (!socket) return;

    socket.emit('get-llm-models');

    socket.on('llm-models-list', (list) => {
      if (list && list.length > 0) setModels(list);
    });

    socket.on('model-changed', (newModel) => {
      setSelected(newModel);
    });

    return () => {
      socket.off('llm-models-list');
      socket.off('model-changed');
    };
  }, [socket]);

  const handleSelect = (model) => {
    setSelected(model);
    setIsOpen(false);
    socket.emit('switch-llm-model', model);
  };

  // Group models by provider
  const { openrouterModels, geminiModels } = useMemo(() => {
    const or = [];
    const gm = [];
    for (const m of models) {
      const prov = getProvider(m);
      if (prov === 'openrouter') or.push(m);
      else if (prov === 'gemini') gm.push(m);
    }
    return { openrouterModels: or, geminiModels: gm };
  }, [models]);

  const selectedLabel = MODEL_DISPLAY[selected] || formatShortLabel(selected);

  return (
    <div className="relative z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 transition-colors"
      >
        {selected.startsWith('openrouter:') ? (
          <Globe size={14} className="text-emerald-400" />
        ) : (
          <Cpu size={14} className="text-cyan-400" />
        )}
        <span className="text-sm font-medium text-cyan-100 max-w-[160px] truncate">
          {selectedLabel}
        </span>
        <ChevronDown size={12} className={`text-cyan-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute right-0 mt-2 w-64 bg-[#0a0f18] border border-cyan-500/20 rounded-lg shadow-xl shadow-cyan-900/20 overflow-hidden max-h-[70vh] overflow-y-auto"
          >
            <div className="p-2">
              {/* OpenRouter Section */}
              {openrouterModels.length > 0 && (
                <>
                  <div className="flex items-center gap-1.5 px-2 py-1.5 mb-1">
                    <Sparkles size={12} className="text-emerald-400" />
                    <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                      OpenRouter Free Models
                    </p>
                  </div>
                  {openrouterModels.map((model) => (
                    <button
                      key={model}
                      onClick={() => handleSelect(model)}
                      className="w-full text-left px-2 py-1.5 text-sm text-gray-300 hover:bg-white/5 rounded flex justify-between items-center group"
                    >
                      <span className="group-hover:text-white transition-colors">
                        {MODEL_DISPLAY[model] || formatShortLabel(model)}
                      </span>
                      {selected === model && <Check size={12} className="text-emerald-400" />}
                    </button>
                  ))}
                </>
              )}

              {/* Gemini Section */}
              {geminiModels.length > 0 && (
                <>
                  <div className="flex items-center gap-1.5 px-2 py-1.5 mt-2 mb-1 border-t border-white/5 pt-3">
                    <Cpu size={12} className="text-cyan-400" />
                    <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                      Gemini
                    </p>
                  </div>
                  {geminiModels.map((model) => (
                    <button
                      key={model}
                      onClick={() => handleSelect(model)}
                      className="w-full text-left px-2 py-1.5 text-sm text-gray-300 hover:bg-white/5 rounded flex justify-between items-center group"
                    >
                      <span className="group-hover:text-white transition-colors">
                        {MODEL_DISPLAY[model] || formatShortLabel(model)}
                      </span>
                      {selected === model && <Check size={12} className="text-cyan-400" />}
                    </button>
                  ))}
                </>
              )}

              {models.length === 0 && (
                <p className="text-xs text-gray-500 px-2 py-2">No models available — check API keys</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
