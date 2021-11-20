vscode-codex
============
  [![CI](https://github.com/Implicate-dev/codex-vscode/actions/workflows/main.yml/badge.svg)](https://github.com/Implicate-dev/codex-vscode/actions/workflows/main.yml)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/implicate-dev.codex-vscode)](https://marketplace.visualstudio.com/items?itemName=implicate-dev.codex-vscode)


Adds a Codex completion command using the OpenAI codex API. 

100% of this addon was originally generated in codex, and since then I've used it to iterate on the original extension. I've moved much around but most of it is still codex generated (including this readme).

I'd like to add many more completion options and ways of adding context. In the future I may explore AST crawling, and transforming wrapped code based on a prompt or context. 

Pull Requests welcome

## Installation

Outside of development, install from the [VSCode Extension Marketplace](https://marketplace.visualstudio.com/items?itemName=implicate-dev.codex-vscode).

For development, clone this repository and symlink the folder to ~/.vscode/extensions/codex-vscode or compile/run install_dev.go

See [TODO](#TODO) for more information.

## Usage
Set your openAPI apiKey in the extensions settings.

To use, run the command `Codex Complete` from the command palette.

## Configuration

The configuration is stored in the `codex` section of the VSCode configuration.

```json
{
  "codex": {
    "engine": "davinci-codex",
    "temperature": 0,
    "maxTokens": 50,
    "topP": 1,
    "frequencyPenalty": 0,
    "presencePenalty": 0,
    "apiKey": null
  }
}
```
