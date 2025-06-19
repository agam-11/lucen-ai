// src/components/EditorToolbar.jsx
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  List,
  Image,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";

export const EditorToolbar = ({ editor, onImageUploadClick }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b bg-background">
      <Button
        variant={editor.isActive("bold") ? "secondary" : "ghost"}
        size="icon"
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant={editor.isActive("italic") ? "secondary" : "ghost"}
        size="icon"
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
        size="icon"
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        type="button"
        onClick={onImageUploadClick}
      >
        <Image className="h-4 w-4" />
      </Button>
      {/* Alignment */}
      <Button
        variant={editor.isActive({ textAlign: "left" }) ? "secondary" : "ghost"}
        size="icon"
        type="button"
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
      >
        <AlignLeft className="h-4 w-4" />
      </Button>
      <Button
        variant={
          editor.isActive({ textAlign: "center" }) ? "secondary" : "ghost"
        }
        size="icon"
        type="button"
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
      >
        <AlignCenter className="h-4 w-4" />
      </Button>
      <Button
        variant={
          editor.isActive({ textAlign: "right" }) ? "secondary" : "ghost"
        }
        size="icon"
        type="button"
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
      >
        <AlignRight className="h-4 w-4" />
      </Button>
    </div>
  );
};
