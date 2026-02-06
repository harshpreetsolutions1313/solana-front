import React, { useState, useEffect, useRef } from 'react';

const QuantityControl = ({ 
  initialQuantity = 1, 
  min = 1, 
  max = 99, 
  onChange, 
  disabled = false 
}) => {
  // Local state to control the display
  const [localQuantity, setLocalQuantity] = useState(initialQuantity);
  const prevInitialQuantity = useRef(initialQuantity);
  const isLocalChange = useRef(false);

  // Only update local state when initialQuantity changes from parent
  // and it's NOT due to our own change
  useEffect(() => {
    if (!isLocalChange.current && initialQuantity !== prevInitialQuantity.current) {
      setLocalQuantity(initialQuantity);
      prevInitialQuantity.current = initialQuantity;
    }
    isLocalChange.current = false;
  }, [initialQuantity]);

  const handleIncrement = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled || localQuantity >= max) return;
    
    const newValue = localQuantity + 1;
    isLocalChange.current = true;
    setLocalQuantity(newValue);
    prevInitialQuantity.current = newValue;
    
    if (onChange) {
      onChange(newValue);
    }
  };

  const handleDecrement = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled || localQuantity <= min) return;
    
    const newValue = localQuantity - 1;
    isLocalChange.current = true;
    setLocalQuantity(newValue);
    prevInitialQuantity.current = newValue;
    
    if (onChange) {
      onChange(newValue);
    }
  };

  return (
    <div className="d-flex rounded-4 overflow-hidden">
      <button
        type="button"
        onClick={handleDecrement}
        disabled={disabled || localQuantity <= min}
        className="quantity__minus border border-end border-gray-100 flex-shrink-0 h-48 w-48 text-neutral-600 flex-center hover-bg-main-600 hover-text-white disabled:opacity-75"
        style={{ minWidth: '48px', minHeight: '48px' }}
      >
        <i className="ph ph-minus" />
      </button>
      <input
        type="number"
        className="quantity__input flex-grow-1 border border-gray-100 border-start-0 border-end-0 text-center w-32 px-4"
        value={localQuantity}
        min={min}
        max={max}
        readOnly
        style={{ minWidth: '60px' }}
      />
      <button
        type="button"
        onClick={handleIncrement}
        disabled={disabled || localQuantity >= max}
        className="quantity__plus border border-end border-gray-100 flex-shrink-0 h-48 w-48 text-neutral-600 flex-center hover-bg-main-600 hover-text-white disabled:opacity-75"
        style={{ minWidth: '48px', minHeight: '48px' }}
      >
        <i className="ph ph-plus" />
      </button>
    </div>
  );
};

export default QuantityControl;