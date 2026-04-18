import { useState, FormEvent, useRef } from 'react';
import { Plus, Star } from 'lucide-react';

interface InputBarProps {
  onAddIdea: (text: string, isCentral?: boolean) => void;
}

export function InputBar({ onAddIdea }: InputBarProps) {
  const [input, setInput] = useState('');
  const [isCentral, setIsCentral] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onAddIdea(input.trim(), isCentral);
      setInput('');
      setIsCentral(false);
      inputRef.current?.focus();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-6">
      {/* Central toggle */}
      <button
        type="button"
        onClick={() => setIsCentral(v => !v)}
        className="flex-shrink-0 flex items-center justify-center rounded-2xl transition-all"
        style={{
          width: 64,
          height: 64,
          background: isCentral
            ? 'linear-gradient(135deg, #d97706, #b45309)'
            : 'rgba(255,255,255,0.05)',
          boxShadow: isCentral ? '0 0 16px rgba(245,158,11,0.4)' : 'none',
          border: isCentral ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(255,255,255,0.08)',
          color: isCentral ? 'white' : '#64748b'
        }}
        title="Marcar como ideia central"
      >
        <Star size={24} fill={isCentral ? 'currentColor' : 'none'} />
      </button>

      {/* Text input */}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Nova ideia... pressione Enter para adicionar"
        className="flex-1 px-8 py-5 text-xl outline-none rounded-2xl"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: '#e2e8f0',
          caretColor: '#6366f1'
        }}
        onFocus={e => (e.target.style.border = '1px solid rgba(99,102,241,0.5)')}
        onBlur={e => (e.target.style.border = '1px solid rgba(255,255,255,0.08)')}
      />

      {/* Submit */}
      <button
        type="submit"
        className="flex items-center gap-3 px-10 py-5 rounded-2xl text-xl font-bold transition-all flex-shrink-0"
        style={{
          background: input.trim()
            ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
            : 'rgba(255,255,255,0.05)',
          color: input.trim() ? 'white' : '#64748b',
          boxShadow: input.trim() ? '0 4px 16px rgba(99,102,241,0.4)' : 'none',
          border: '1px solid rgba(255,255,255,0.08)'
        }}
      >
        <Plus size={20} />
        Adicionar
      </button>
    </form>
  );
}
