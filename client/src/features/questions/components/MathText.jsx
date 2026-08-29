import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export function renderLatex(text) {
  if (!text) return '';

  // Replace display math $$...$$ first
  let result = text.replace(/\$\$(.*?)\$\$/gs, (_, math) => {
    try {
      return katex.renderToString(math, { displayMode: true, throwOnError: false });
    } catch { return math; }
  });

  // Replace inline math $...$
  result = result.replace(/\$(.*?)\$/g, (_, math) => {
    try {
      return katex.renderToString(math, { displayMode: false, throwOnError: false });
    } catch { return math; }
  });

  // Replace \(...\) inline
  result = result.replace(/\\\((.*?)\\\)/g, (_, math) => {
    try {
      return katex.renderToString(math, { displayMode: false, throwOnError: false });
    } catch { return math; }
  });

  // Replace \[...\] display
  result = result.replace(/\\\[(.*?)\\\]/gs, (_, math) => {
    try {
      return katex.renderToString(math, { displayMode: true, throwOnError: false });
    } catch { return math; }
  });

  return result;
}

export default function MathText({ text, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && text) {
      ref.current.innerHTML = renderLatex(text);
    }
  }, [text]);

  return <span ref={ref} className={className} />;
}
