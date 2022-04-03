import "@logseq/libs";
import { BlockEntity } from "@logseq/libs/dist/LSPlugin.user";
import {
  getFile,
  CodeType,
  getCommits,
  getRepos,
  parseFilePath,
} from "./FileUtils";

const settingsTemplate = [
  {
    key: "githubPat",
    type: "string",
    default: "",
    title: "Required: Your Personal Access Token",
    description:
      "The plugin requires a personal access token with full repo rights. For details on how to set this up for your github account, see the README notes for more details.",
  },
  {
    key: "githubAccount",
    type: "string",
    default: "",
    title: "Optional: Default Github Account",
    description:
      "Your default github account username. For private repositories, it must have access to the repo that contains the code to be retrieved. See the README notes for more details.",
  },
  {
    key: "githubRepo",
    type: "string",
    optional: true,
    default: "",
    title: "Optional: Your default repository name",
    description:
      "You can enter a default repository name to be used when none is explicitly provided in the file path. See the README notes for more details.",
  },
];
logseq.useSettingsSchema(settingsTemplate);

const checkSettings = (): boolean => {
  let initialSettings = logseq!.settings;
  if (logseq.settings) {
    if (logseq.settings.githubPat) return true;
  }

  logseq.App.showMsg(
    "Please enter your access token in the plugin settings.",
    "error"
  );
  return false;
};

const genRandomStr = () =>
  Math.random()
    .toString(36)
    .replace(/[^a-z]+/g, "")
    .substr(0, 5);

const refreshCode = async (blockId: string, filePath?: string) => {
  const block = await logseq.Editor.getBlock(blockId, {
    includeChildren: true,
  });
  if (
    block === null ||
    block.children === undefined ||
    block.children?.length === 0
  ) {
    return;
  }
  // Abort if commit is pinned
  if (block.content.includes("true}}")) {
    logseq.App.showMsg(
      `Cannot refresh a pinned file. Click on pin then try again.`
    );
    return;
  }

  const existingBlock = await logseq.Editor.getBlock(
    (block?.children![0] as BlockEntity).id
  );

  // Delete existing code block
  if (existingBlock) await logseq.Editor.removeBlock(existingBlock.uuid);

  // Call update to refresh code
  getCode(blockId, filePath);
};

/**
 *
 * @param blockId
 * @returns Void
 *
 * Called when logseq is intialized or plugin is loaded.
 */

const getCode = async (blockId: string, filePath?: string) => {
  // Get Current Block
  const block = await logseq.Editor.getBlock(blockId, {
    includeChildren: true,
  });
  if (
    block === null ||
    block.children === undefined ||
    block.children?.length !== 0
  ) {
    return;
  }

  const _filePath = filePath ? filePath : block!.content;

  // Get the file from Github
  const contents = await getFile(_filePath);

  if (contents.type == CodeType.error) {
    return;
  }

  // Escape any '```' in the body of the text as this breaks codemirror
  if (contents.content.includes("```")) {
    contents.content = contents.content.split("```").join("\\`\\`\\`");
  }

  // Insert the code block
  let targetBlock = await logseq.Editor.insertBlock(
    block!.uuid,
    `\`\`\`${contents.type}\r\n${contents.content}\r\n\`\`\``,
    {
      sibling: false,
      before: false,
    }
  );

  insertRefreshBtn(blockId, contents.commit_id, contents.commit_message);
  // Exit editor
  logseq.Editor.exitEditingMode();
};

const insertRefreshBtn = async (
  blockId: string,
  commit_id?: string,
  commit_message?: string,
  pin = true
) => {
  const block = await logseq.Editor.getBlock(blockId, {
    includeChildren: true,
  });
  // Insert recycle button
  if (!block!.content.includes("renderer :github")) {
    let [account, repo, file] = parseFilePath(block!.content);
    logseq.Editor.updateBlock(
      blockId,
      `{{renderer :github_${genRandomStr()}, ${
        account + "::" + repo + ":" + file
      }${commit_id ? ", " + commit_id : ""}${
        commit_message ? ", " + commit_message : ""
      }${pin ? ", true" : ", false"}}}`
    );
  } else {
    //update commit id
    let bits = block!.content.split(",");
    bits[2] = commit_id ? commit_id : bits[2];
    bits[3] = commit_message ? commit_message : bits[3];
    let replacement = bits.join(",");
    logseq.Editor.updateBlock(blockId, replacement);
  }
};

// Called when logseq is first loaded
logseq
  .ready(() => {
    console.log("logseq-plugin-github-get loaded");

    logseq.Editor.registerSlashCommand("Get Github File", async (e) => {
      if (!checkSettings()) return;

      getCode(e.uuid);
    });
    logseq.Editor.registerBlockContextMenuItem("Get Github File", async (e) => {
      if (!checkSettings()) return;
      insertRefreshBtn(e.uuid);
      getCode(e.uuid);
    });

    logseq.setMainUIInlineStyle({
      position: "fixed",
      width: "290px",
      zIndex: 999,
      transform: "translateX(-50%)",
    });

    logseq.App.onMacroRendererSlotted(({ slot, payload }) => {
      let [type, filePath, commit_id, commit_message, pin] = payload.arguments;

      let [account, repo, file] = parseFilePath(filePath);

      if (!type?.startsWith(":github_")) return;

      // models
      logseq.provideModel({
        async refreshGithub(e: any) {
          if (!checkSettings()) return;
          refreshCode(e.dataset.blockUuid, e.dataset.filePath);
        },
        async togglePin(e: any) {
          if (!checkSettings()) return;
          const block = await logseq.Editor.getBlock(e.dataset.blockUuid, {
            includeChildren: false,
          });
          // Toggle Pin setting
          let updatedContent = "";
          if (block?.content.includes("false")) {
            updatedContent = block?.content.replace("false", "true");
            const { rect } = e;
            logseq.toggleMainUI();
          }
          if (block?.content.includes("true")) {
            updatedContent = block?.content.replace("true", "false");
          }

          // Update recycle button
          logseq.Editor.updateBlock(e.dataset.blockUuid, updatedContent);
        },
      });

      logseq.provideStyle(`
    .github-refresh-btn {
       border: 1px solid var(--ls-border-color); 
       white-space: initial; 
       padding: 2px 4px; 
       border-radius: 4px; 
       user-select: none;
       cursor: default;
       display: flex;
       align-content: center;
    }
    
    .github-refresh-btn:hover {
      opacity: .8;
      background-color: #92a8d1;
      color: white;
    }

    .github-commit-id {
      border: 1px solid var(--ls-border-color); 
      white-space: initial; 
      padding: 2px 4px; 
      border-radius: 4px; 
      user-select: none;
      cursor: default;
      display: flex;
      align-content: center;
      color: #c9c8c5;
   }

   .github-commit-id:hover {
    opacity: .8;
    background-color: #92a8d1;
    color: white;
  }



  `);

      logseq.provideUI({
        key: "github_refresh_mounted",
        slot,
        reset: true,
        template: `
            <button class="github-refresh-btn"
              title= "${account + "::" + repo + ":" + file}"
              data-slot-id="${slot}"
              data-block-uuid="${payload.uuid}"
              data-file-path="${account + "::" + repo + ":" + file}"
              data-on-click="refreshGithub">
            ${file} 🔄 
            </button>
            <button class="github-commit-id"
              title= "${commit_message}"
              data-block-uuid="${payload.uuid}"
              data-on-click="togglePin">
            ${commit_id.substring(0, 7)}${pin == "true" ? "📌" : ""}
            </button>
          `,
      });
    });
  })
  .catch((err) => {
    console.log(`VS Code Error: ${err.message}`);
  });
