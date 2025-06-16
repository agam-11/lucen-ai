// src/lib/tiptap/SlashCommand.js
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("slashCommand"),
        props: {
          handleKeyDown: (view, event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              const { state } = view;
              const { $from } = state.selection;

              // This is the robust way to get the current line's text
              const parent = $from.parent;
              const lineText = parent.textContent;

              const match = lineText.match(/^\/\/([\s\S]*)/);

              if (match) {
                // Prevent the default Enter key behavior
                event.preventDefault();

                // Dispatch our custom command
                view.dispatch(
                  view.state.tr.setMeta("slashCommand", {
                    command: match[1].trim(),
                  })
                );
                return true; // We handled the event
              }
            }
            return false; // Let Tiptap handle other Enter presses
          },
        },
      }),
    ];
  },
});
