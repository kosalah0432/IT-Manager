import { useState, useEffect, useRef } from 'react';
import { safeStorage } from '../utils/storage';

export function useFormPersistence<T>(key: string, initialData: T, isOpen: boolean) {
  // Use lazy state initialization to load from localStorage instantly on mount
  const [formData, setFormData] = useState<T>(() => {
    try {
      const saved = safeStorage.getItem(`form_draft_${key}`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse initial form draft', e);
    }
    return initialData;
  });

  const [isDirty, setIsDirty] = useState(() => {
    try {
      return !!safeStorage.getItem(`form_draft_${key}`);
    } catch {
      return false;
    }
  });

  // Keep a ref to initialData to avoid adding it to effect dependencies
  const initialDataRef = useRef(initialData);
  useEffect(() => {
    initialDataRef.current = initialData;
  }, [initialData]);

  // Sync draft from localStorage if isOpen changes or key changes (e.g. they navigated and came back)
  useEffect(() => {
    if (isOpen) {
      const saved = safeStorage.getItem(`form_draft_${key}`);
      if (saved) {
        try {
          setFormData(JSON.parse(saved));
          setIsDirty(true);
        } catch (e) {
          console.error('Failed to parse form draft', e);
        }
      }
    }
  }, [isOpen, key]);

  // Save to localStorage when formData changes and isOpen is true
  useEffect(() => {
    if (isOpen) {
      const isInitial = JSON.stringify(formData) === JSON.stringify(initialDataRef.current);
      if (!isInitial) {
        safeStorage.setItem(`form_draft_${key}`, JSON.stringify(formData));
        setIsDirty(true);
      } else {
        safeStorage.removeItem(`form_draft_${key}`);
        setIsDirty(false);
      }
    }
  }, [formData, isOpen, key]);

  const updateForm = (updates: Partial<T>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
  };

  const resetForm = () => {
    setFormData(initialDataRef.current);
    setIsDirty(false);
    safeStorage.removeItem(`form_draft_${key}`);
  };

  const clearPersistence = () => {
    safeStorage.removeItem(`form_draft_${key}`);
  };

  return { formData, setFormData, updateForm, resetForm, clearPersistence, isDirty, setIsDirty };
}

