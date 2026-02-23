import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCategories, setCategories } from '../core.js';

const PILL_COLORS = [
  { bg: '#FFF7ED', text: '#EA580C', border: '#FDBA74' },
  { bg: '#F0FDFA', text: '#0D9488', border: '#5EEAD4' },
  { bg: '#F5F3FF', text: '#7C3AED', border: '#C4B5FD' },
  { bg: '#FDF2F8', text: '#DB2777', border: '#F9A8D4' },
  { bg: '#FFFBEB', text: '#D97706', border: '#FCD34D' },
  { bg: '#ECFEFF', text: '#0891B2', border: '#67E8F9' },
  { bg: '#FEF2F2', text: '#DC2626', border: '#FCA5A5' },
  { bg: '#F7FEE7', text: '#65A30D', border: '#BEF264' },
];

function getColorForIndex(i) {
  return PILL_COLORS[i % PILL_COLORS.length];
}

export default function CategoryManager({ selectedCategoryId, onSelectCategory, onDataChange }) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);
  const categories = getCategories();

  function addCategory() {
    const name = inputValue.trim();
    if (!name) return;
    const cats = getCategories();
    const id = crypto.randomUUID ? crypto.randomUUID() : `cat_${Date.now()}`;
    cats.push({ id, name });
    setCategories(cats);
    setInputValue('');
    onSelectCategory(id);
    onDataChange();
    inputRef.current?.focus();
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') addCategory();
  }

  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
    >
      <div className="card-title">
        <span className="card-title-icon">🏷️</span>
        Categories
      </div>

      <div className="input-row">
        <input
          ref={inputRef}
          className="input"
          type="text"
          placeholder="New category…"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <motion.button
          className="btn btn-primary"
          onClick={addCategory}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          Add
        </motion.button>
      </div>

      {categories.length === 0 ? (
        <p className="empty-state">No categories yet — add one above!</p>
      ) : (
        <div className="category-pills">
          <AnimatePresence>
            {categories.map((cat, i) => {
              const color = getColorForIndex(i);
              const isSelected = cat.id === selectedCategoryId;
              return (
                <motion.button
                  key={cat.id}
                  className={`category-pill${isSelected ? ' selected' : ''}`}
                  style={{
                    background: color.bg,
                    color: color.text,
                    borderColor: isSelected ? color.text : color.border,
                  }}
                  onClick={() => onSelectCategory(cat.id)}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  {cat.name}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
