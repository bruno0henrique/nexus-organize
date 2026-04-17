import { useState, FormEvent } from 'react';
import { Plus, Star } from 'lucide-react';

interface InputBarProps {
  onAddIdea: (text: string, isCentral?: boolean) => void;
}

export function InputBar({ onAddIdea }: InputBarProps) {
  const [input, setInput] = useState('');
  const [isCentral, setIsCentral] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onAddIdea(input, isCentral);
      setInput('');
      setIsCentral(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <button
        type="button"
        onClick={() => setIsCentral(!isCentral)}
        className={`px-3 py-2 rounded-lg transition-all border ${
          isCentral
            ? 'bg-amber-600 border-amber-500 text-white'
            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-amber-400'
        }`}
        title="Marcar como ideia central"
      >
        <Star size={20} fill={isCentral ? 'currentColor' : 'none'} />
      </button>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Digite uma ideia e pressione Enter..."
        className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-100 placeholder-slate-500"
      />
      <button
        type="submit"
        className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
      >
        <Plus size={20} />
        Adicionar
      </button>
    </form>
  );
}
