"use client";

import React, { useEffect, useRef, useState } from 'react';
import styles from './ScheduleGrid.module.css'; // Re-use styles or create new ones? We'll reuse provided class via prop or similar.

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    className?: string;
    placeholder?: string;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ value, onChange, onBlur, className, placeholder }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Toolbar State
    const [toolbar, setToolbar] = useState<{ visible: boolean; top: number; left: number } | null>(null);

    // Sync content when value prop changes (e.g., navigation)
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            // Only update if content is different to avoid cursor reset issues during typing
            // (Though typically typing updates local DOM first, then prop comes back matching)
            editorRef.current.innerHTML = value;
        }
    }, [value]);

    // Handle Selection for Toolbar
    useEffect(() => {
        const handleSelectionChange = () => {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
                setToolbar(null);
                return;
            }

            // Check if selection is inside this editor
            if (editorRef.current && editorRef.current.contains(selection.anchorNode)) {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                setToolbar({
                    visible: true,
                    top: rect.bottom + 5, // Just below
                    left: rect.left + (rect.width / 2) - 50 // Centered
                });
            } else {
                setToolbar(null);
            }
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
        };
    }, []);

    const handleInput = () => {
        if (editorRef.current) {
            // Pass pure HTML
            const html = editorRef.current.innerHTML;
            onChange(html);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            document.execCommand('bold', false);
            handleInput();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
            e.preventDefault();
            document.execCommand('italic', false);
            handleInput();
        } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'x' || e.key === 'X')) {
            e.preventDefault();
            document.execCommand('strikeThrough', false);
            handleInput();
        }
    };

    const applyFormat = (command: string) => {
        document.execCommand(command, false);
        handleInput();
        // Prevent losing focus is handled by onMouseDown preventDefault on the button
    };

    return (
        <>
            <div
                ref={editorRef}
                className={className}
                contentEditable
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                onBlur={onBlur}
                style={{
                    minHeight: '32px',
                    outline: 'none',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    cursor: 'text'
                }}
                suppressContentEditableWarning={true}
            />
            {toolbar && toolbar.visible && (
                <div
                    className={styles.formattingToolbar}
                    style={{ top: toolbar.top, left: toolbar.left }}
                    onMouseDown={(e) => e.preventDefault()} // Prevent blur
                >
                    <button className={styles.formatBtn} onClick={() => applyFormat('bold')} title="Bold">B</button>
                    <button className={styles.formatBtn} onClick={() => applyFormat('italic')} title="Italic">I</button>
                    <button className={styles.formatBtn} style={{ textDecoration: 'line-through' }} onClick={() => applyFormat('strikeThrough')} title="Strike">S</button>
                </div>
            )}
        </>
    );
};

export default MarkdownEditor;
