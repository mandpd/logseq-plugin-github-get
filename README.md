# Embed code from a Github repository into a logseq block

## Overview

This plugin allows the user to easily import the contents of files from a Github repository that the Github user has acess to. 
The main goal is to enhance the ability to document code development and final code using [Logseq](https://docs.logseq.com).

A new logseq graph can be located in the code repository under a `\docs` folder.
The logseq Journal can be used to document day-by-day development progress. 
As code is developed and pushed to Github, the code can be retrieved and inserted into a Logseq page block.
The code can then be documented using Logseq's extensive note taking capabilities.

When a code file is updated and the changes pushed to Github, the code in Logseq can be immediately updated to the latest version using the `refresh` icon.

## Example

![gif file](logseq-github.gif)

## Configuration

1. Click on the gear icon in the bottom-left of the `logseq-plugin-github-code`  card.
2. Select `Open Settings`.
3. Enter your github `username` (not your email address) in the first field labeled `githubAccount`.
4. Enter a personal access token will full repo access rights in the second field labeled `githubPat`. For more information on how to generate a personal access token, look [here](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
5. Optionally, enter the name of a repository that will be used if none is provided when running the `Embed Github Code` command.

## Using Logseq as a code documentation tool

1. Open the local version of the repository that you want to document within your IDE (VS Code is used in the example given above).
2. Create a root directory called `docs`.
3. Open Logseq and select `Add a graph` from the left sidebar graph menu item.
4. Navigate to the docs `folder` that you have just created.
5. Use Logseq to document your development process.
6. When you are ready to document specific code in the repository, follow the per-file to embed process described below. 


## Per-File to embed Process

1. Ensure that the file is pushed to your Github repository. The plugin will retrieve the most recent version of the file.
2. Select the file within your IDE that you wish to embed within LogSeq.
3. Copy the relative path of the file from the root of the local copy. (You can obtain this in VS Code by right-clicking on the file in the Explorer and selecting `Copy Relative Path` from the context menu).
4. Select an empty block in LogSeq where you want to import the file.
5. If you have not set a default repository, or are copyinf from a different repository, type the name of the repository into the block folloed by `:`. Paste the relative path of the file immediately after the colon.
6. Run the `Github Code Embed` command by entering `/Github Code Embed` after the file path.
7. If the configuration and file path are correctly entered the code should appear immediately below the selected block.

## Installing the Plugin

1. Clone the [plugin repo](https://github.com/mandpd/logseq-plugin-vscode-ref) to a local folder.
2. In logseq, open `Logseq→Settings`, enable developer mode.
3. Open `Logseq→Plugins`, choose `Load unpacked plugin`, and select the location where you saved the source code.
4. Follow the configuration steps given above.
5. The `Github Code Embed` command should now be installed and active.

