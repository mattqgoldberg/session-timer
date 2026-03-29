import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getCategories,
  getVisibleCategories,
  getHiddenCategories,
  setCategories,
  deleteCategory as deleteCategoryCore,
  updateCategory,
} from '../core.js';
import { COLOR_PALETTE, DEFAULT_COLOR, colorVariants, getCategoryColor } from '../colors.js';

function ColorPicker({ value, onChange }) {
  return (
    <div className="color-picker">
      {COLOR_PALETTE.map((hex) => (
        <button
          key={hex}
          type="button"
          className={`color-dot${value === hex ? ' selected' : ''}`}
          style={{ background: hex }}
          onClick={() => onChange(hex)}
          aria-label={hex}
        />
      ))}
    </div>
  );
}

function EditPopover({ cat, onSave, onDelete, onToggleHidden, onClose }) {
  const [name, setName] = useState(cat.name);
  const [color, setColor] = useState(getCategoryColor(cat));

  function handleSave(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(cat.id, trimmed, color);
  }

  return (
    <motion.div
      className="category-edit-popover"
      initial={{ opacity: 0, scale: 0.9, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      <form onSubmit={handleSave}>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <ColorPicker value={color} onChange={setColor} />
        <div className="category-edit-actions">
          <button type="submit" className="btn btn-primary btn-sm">Save</button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onToggleHidden(cat.id, !cat.hidden)}
          >
            {cat.hidden ? 'Unhide' : 'Hide'}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="btn btn-sm"
            style={{ color: 'var(--color-danger)', marginLeft: 'auto' }}
            onClick={() => onDelete(cat.id)}
          >
            Delete
          </button>
        </div>
      </form>
    </motion.div>
  );
}

export default function CategoryManager({ selectedCategoryId, onSelectCategory, onDataChange }) {
  const [inputValue, setInputValue] = useState('');
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLOR);
  const [editingCatId, setEditingCatId] = useState(null);
  const [activeTab, setActiveTab] = useState('visible');
  const inputRef = useRef(null);
  const visibleCategories = getVisibleCategories();
  const hiddenCategories = getHiddenCategories();
  const categories = activeTab === 'hidden' ? hiddenCategories : visibleCategories;

  useEffect(() => {
    if (activeTab === 'hidden' && hiddenCategories.length === 0) {
      setActiveTab('visible');
    }
  }, [activeTab, hiddenCategories.length]);

  function addCategory() {
    const name = inputValue.trim();
    if (!name) return;
    const cats = getCategories();
    const id = crypto.randomUUID ? crypto.randomUUID() : `cat_${Date.now()}`;
    cats.push({ id, name, color: selectedColor, hidden: false });
    setCategories(cats);
    setInputValue('');
    const nextIdx = COLOR_PALETTE.indexOf(selectedColor);
    setSelectedColor(COLOR_PALETTE[(nextIdx + 1) % COLOR_PALETTE.length]);
    onSelectCategory(id);
    onDataChange();
    inputRef.current?.focus();
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') addCategory();
  }

  function saveEdit(id, newName, newColor) {
    updateCategory(id, { name: newName, color: newColor });
    onDataChange();
    setEditingCatId(null);
  }

  function setCategoryHidden(id, hidden) {
    setEditingCatId(null);
    updateCategory(id, { hidden });
    if (hidden && selectedCategoryId === id) onSelectCategory(null);
    if (!hidden) setActiveTab('visible');
    onDataChange();
  }

  function deleteCategory(id) {
    setEditingCatId(null);
    deleteCategoryCore(id);
    if (selectedCategoryId === id) onSelectCategory(null);
    onDataChange();
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

      <ColorPicker value={selectedColor} onChange={setSelectedColor} />

      {(visibleCategories.length > 0 || hiddenCategories.length > 0) && (
        <div className="category-tabs" role="tablist" aria-label="Category tabs">
          <button
            type="button"
            className={`category-tab${activeTab === 'visible' ? ' active' : ''}`}
            onClick={() => setActiveTab('visible')}
          >
            Categories ({visibleCategories.length})
          </button>
          <button
            type="button"
            className={`category-tab${activeTab === 'hidden' ? ' active' : ''}`}
            onClick={() => setActiveTab('hidden')}
          >
            Hidden ({hiddenCategories.length})
          </button>
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        {categories.length === 0 ? (
          <motion.p
            key={`${activeTab}-empty`}
            className="empty-state"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            {activeTab === 'hidden' ? 'No hidden categories.' : 'No categories yet — add one above!'}
          </motion.p>
        ) : (
          <motion.div
            key={activeTab}
            className="category-pills"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <AnimatePresence initial={false}>
              {categories.map((cat) => {
                const cv = colorVariants(getCategoryColor(cat));
                const isSelected = activeTab === 'visible' && cat.id === selectedCategoryId;
                return (
                  <motion.div
                    key={cat.id}
                    className="category-pill-wrapper"
                    layout
                    initial={{ opacity: 1, scale: 1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.14, ease: 'easeOut' }}
                  >
                    <motion.button
                      className={`category-pill${isSelected ? ' selected' : ''}`}
                      style={{
                        background: cv.bg,
                        color: cv.text,
                        borderColor: isSelected ? '#1C1917' : cv.border,
                      }}
                      onClick={() => {
                        if (activeTab === 'visible') onSelectCategory(cat.id);
                      }}
                      whileHover={activeTab === 'visible' ? { scale: 1.03 } : { scale: 1.01 }}
                      whileTap={activeTab === 'visible' ? { scale: 0.98 } : { scale: 0.99 }}
                      transition={{ duration: 0.15 }}
                    >
                      <span className="pill-color-dot" style={{ background: getCategoryColor(cat) }} />
                      {cat.name}
                    </motion.button>
                    <button
                      className="pill-edit-btn"
                      title="Edit category"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCatId(editingCatId === cat.id ? null : cat.id);
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <AnimatePresence>
                      {editingCatId === cat.id && (
                        <EditPopover
                          cat={cat}
                          onSave={saveEdit}
                          onDelete={deleteCategory}
                          onToggleHidden={setCategoryHidden}
                          onClose={() => setEditingCatId(null)}
                        />
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
