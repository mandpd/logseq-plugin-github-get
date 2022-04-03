import axios from "axios";
import "@logseq/libs";

// Github API Data TODO: Move to plugin settings
const decode = (str: string): string =>
  Buffer.from(str, "base64").toString("binary");
const contents = "/contents/";
let commit_id = "";
let commit_message = "";

/**
 * File Types that are recognized on import
 **/
export enum CodeType {
  typescript = "typescript",
  javascript = "js",
  html = "html",
  error = "error",
  php = "php",
  md = "markdown",
  notebook = "ipynb",
  julia = "julia",
  R = "R",
  python = "python",
  yaml = "yaml",
  docker = "dockerfile",
  tsreact = "typescript",
}

/**
 * Extensions that correspond to the supported file types
 **/
const CodeTypes = [
  {
    ext: "js",
    type: CodeType.javascript,
  },
  {
    ext: "ts",
    type: CodeType.typescript,
  },
  {
    ext: "html",
    type: CodeType.html,
  },
  {
    ext: "php",
    type: CodeType.php,
  },
  {
    ext: "md",
    type: CodeType.md,
  },
  {
    ext: "ipynb",
    type: CodeType.notebook,
  },
  {
    ext: "jl",
    type: CodeType.julia,
  },
  {
    ext: "R",
    type: CodeType.R,
  },
  {
    ext: "py",
    type: CodeType.python,
  },
  {
    ext: "yml",
    type: CodeType.yaml,
  },
  {
    ext: "dockerfile",
    type: CodeType.docker,
  },
  {
    ext: "tsx",
    type: CodeType.tsreact,
  },
];

/**
 * Internal structure for passing code file contents
 */
interface CodeFile {
  content: string;
  type: CodeType | undefined;
  commit_id?: string;
  commit_message?: string;
}

interface CommitListEntry {
  id: string;
  date: Date;
  message: string;
}

interface RepoListEntry {
  name: string;
  description: string;
}

let repoCommitsList: {
  account: string;
  repo: string;
  commits: CommitListEntry[];
}[] = [];

export const parseFilePath = (filePath: string): string[] => {
  let account = logseq!.settings!.githubAccount
    ? logseq!.settings!.githubAccount
    : "";
  let repo = logseq!.settings!.githubRepo ? logseq!.settings!.githubRepo : "";

  // Parse filepath for Github account name
  let parts = filePath.split("::");
  if (parts.length == 2) {
    // Parse the path for the account name
    account = parts[0];
    filePath = parts[1];
  }

  // Parse filePath for repo name
  parts = filePath.split(":");
  if (parts.length == 2) {
    repo = parts[0];
    filePath = parts[1];
  }

  return [account, repo, filePath];
};

/**
 *
 * @param filePath
 * @returns Promise for the codefile structure for the requested file.
 *
 * Attempts to retrieve the requested file from VS code via the live server on port 5500.
 */

export async function getFile(filePath: string): Promise<CodeFile> {
  //Retrieve github settings
  const githubURL = "https://api.github.com/repos/";

  const token = logseq!.settings!.githubPat;
  try {
    let [account, repo, file] = parseFilePath(filePath);
    // Abort if no account provided
    if (account == "") {
      logseq.App.showMsg(
        `No GitHub account name provided and no default set.`,
        "error"
      );
      return {
        content: "No Github account name provided and do default set.",
        type: CodeType.error,
      };
    }

    // Abort if no repo provided
    if (repo == "") {
      logseq.App.showMsg(`No repository name provided.`, "error");
      return {
        content: "No repository name provided",
        type: CodeType.error,
      };
    }

    await getCommits(account, repo, file);

    // Update commit_id to latest commit
    const repoCommits = repoCommitsList.find((rcl) => {
      return rcl.repo == repo && rcl.account == account;
    })?.commits;
    const latestRepo = repoCommits!.sort(
      (a, b) => b.date.getMilliseconds() - a.date.getMilliseconds()
    )[0];
    commit_id = latestRepo?.id;
    commit_message = latestRepo?.message;

    const endpoint =
      githubURL + account + "/" + repo + contents + file + "?ref=" + commit_id;
    let bits = file.split(".");
    if (bits.length == 1) {
      return {
        content: "No Delimiter",
        type: CodeType.error,
      };
    }
    const fileType = bits[bits.length - 1];
    let response = await axios.get(endpoint, {
      headers: {
        Authorization: `token ${token}`,
      },
    });

    let myText = decode(response.data.content);
    myText.replace(/\n/g, "\r");
    return {
      content: myText,
      type: CodeTypes.find((c) => {
        return c.ext == fileType;
      })?.type,
      commit_id: commit_id,
      commit_message: commit_message,
    };
  } catch (err) {
    if ((err.message = "Failed to fetch")) {
      logseq.App.showMsg(
        `The file was not found. Github is case sensitive so check the case of the path you provided.`,
        "error"
      );
      return {
        content: err.message,
        type: CodeType.error,
      };
    } else {
      logseq.App.showMsg(`error is ${err.message}`, "error");
      return {
        content: err.message,
        type: CodeType.error,
      };
    }
  }
}

export async function getRepos(): Promise<RepoListEntry[]> {
  //Retrieve github settings
  const endpoint = "https://api.github.com/user/repos?per_page=100";
  const token = logseq!.settings!.githubPat;

  let response = await axios.get(endpoint, {
    headers: {
      Authorization: `token ${token}`,
    },
  });
  const repoList: RepoListEntry[] = [];
  response.data.forEach((repo) => {
    repoList.push({
      name: repo.name,
      description: repo.description,
    });
  });
  return repoList;
}

export async function getCommits(
  account: string,
  repo: string,
  file: string
): Promise<void> {
  //Retrieve github settings
  const githubURL = "https://api.github.com/repos/" + account + "/";
  const token = logseq!.settings!.githubPat;

  // Check if the commit list already exists
  let arIndex = repoCommitsList.findIndex((a) => {
    return a.repo == repo && a.account == account;
  });

  //Update commit list
  const endpoint = githubURL + repo + "/commits";

  let response = await axios.get(endpoint, {
    headers: {
      Authorization: `token ${token}`,
    },
  });
  const commitList: {
    account: string;
    repo: string;
    commits: CommitListEntry[];
  } = {
    account: account,
    repo: repo,
    commits: [],
  };
  response.data.forEach((commit) => {
    commitList.commits.push({
      message: commit.commit.message.replace(/\n/g, " ").replace(/\r/g, " "),
      date: new Date(commit.commit.author.date),
      id: commit.url.split("/").pop(),
    });
  });
  // Add or Update
  if (arIndex >= 0) {
    repoCommitsList[arIndex] = commitList;
  } else {
    repoCommitsList.push(commitList);
  }

  return;
}
