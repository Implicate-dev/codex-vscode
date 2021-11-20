import * as vscode from "vscode";
import OpenAI from "openai-api";
import * as Memoizeed from "memoizee";

// Create new output channel
const codexChannel = vscode.window.createOutputChannel("OpenAI");

type CodexConfig = {
  apiKey: string;
  engine: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  completionEngineEnabled: boolean;
  completionEngine: string;
  completionEngineTimeout: number;
  completionEngineDefaultStopSequence: string;
};

const getConfig = (config: vscode.WorkspaceConfiguration): CodexConfig => {
  const apiKey = config.get("apiKey", "");
  const engine = config.get("engine", "davinci-codex");
  const temperature = config.get("temperature", 0);
  const maxTokens = config.get("maxTokens", 50);
  const topP = config.get("topP", 1);
  const frequencyPenalty = config.get("frequencyPenalty", 0);
  const presencePenalty = config.get("presencePenalty", 0);
  const completionEngine = config.get("completionEngine", "cushman-codex");
  const completionEngineEnabled = config.get("completionEngineEnabled", false);
  const completionEngineTimeout = config.get("completionEngineTimeout", 5000);
  const completionEngineDefaultStopSequence = config.get("completionEngineDefaultStopSequence", "\n");

  return {
    apiKey,
    engine,
    temperature,
    maxTokens,
    topP,
    frequencyPenalty,
    presencePenalty,
    completionEngine,
    completionEngineEnabled,
    completionEngineTimeout,
    completionEngineDefaultStopSequence,
  };
};

const registerExtensionCommands = (
  config: CodexConfig,
): vscode.Disposable[] => {
  const client = new OpenAI(config.apiKey);
  const memComplete = Memoizeed(client.complete, { promise: true });
  let disposables: vscode.Disposable[] = [];
  disposables = [
    ...disposables,
    vscode.commands.registerCommand("extension.CodexComplete", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }
      const doc = editor.document;
      const pos = editor.selection.active;
      const text = doc.getText(new vscode.Range(new vscode.Position(0, 0), pos));
      const gptResponse = await client.complete({
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        topP: config.topP,
        frequencyPenalty: config.frequencyPenalty,
        presencePenalty: config.presencePenalty,
        engine: config.engine,
        prompt: text,
      });
      const newText = gptResponse.data.choices[0].text;
      editor.edit((editBuilder) => {
        editBuilder.replace(new vscode.Range(pos, pos), newText);
      });
    }),
  ];
  disposables = [
    ...disposables,
    vscode.commands.registerCommand("extension.CodexReplaceSelection", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }
      const doc = editor.document;
      const text = doc.getText(editor.selection);
      const gptResponse = await memComplete({
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        topP: config.topP,
        frequencyPenalty: config.frequencyPenalty,
        presencePenalty: config.presencePenalty,
        engine: config.engine,
        prompt: text,
      });
      const newText = gptResponse.data.choices[0].text;
      editor.edit((editBuilder) => {
        editBuilder.replace(editor.selection, newText);
      });
    }),
  ];
  if (config.completionEngineEnabled) {
    codexChannel.appendLine(`Completion engine enabled: ${config.completionEngine}`);
    disposables = [
      ...disposables,
      vscode.languages.registerCompletionItemProvider(
        { scheme: "file", language: "*" },
        {
          async provideCompletionItems(
            document: vscode.TextDocument,
            position: vscode.Position,
            token: vscode.CancellationToken,
            context: vscode.CompletionContext
          ) {
            // debug logging
            codexChannel.appendLine(
              `provideCompletionItems: ${document.uri.fsPath} ${position.line} ${position.character}`
            );
            codexChannel.appendLine(`provideCompletionItemsContext: ${JSON.stringify(context)}`);
            token.onCancellationRequested(() => {
              codexChannel.appendLine(`provideCompletionItems: Cancelled`);
            });
            const text = document.getText(new vscode.Range(new vscode.Position(position.line-3, 0), position));
            // Use memoized clientComplete to avoid multiple calls to the OpenAI API
            const gptResponse = await client.complete({
              temperature: config.temperature,
              maxTokens: config.maxTokens,
              topP: config.topP,
              frequencyPenalty: config.frequencyPenalty,
              presencePenalty: config.presencePenalty,
              engine: config.completionEngine,
              stop: config.completionEngineDefaultStopSequence,
              prompt: text,
              n: 3,
            });
            codexChannel.appendLine(`provideCompletionGptResponse: ${JSON.stringify(gptResponse.data)}`);
            const items = gptResponse.data.choices.map((choice) => {
              const item = new vscode.CompletionItem({label: `${choice.text.split('\n',1)[0].trim()}`, description: "Detail", detail: "AI"}, vscode.CompletionItemKind.Text)
              item.insertText = choice.text.trim()
              item.detail = "Codex Completion"
              item.documentation = choice.text.trim()
              item.preselect = true
              item.sortText = "000AAAaaa"
              return item
            });
            codexChannel.appendLine(`provideCompletionItems: ${JSON.stringify(items)}`);
            return items
          },
        },
        ".",
        "\n",
        ":",
        "\t",
        ","
      ),
    ];
  }
  return disposables;
};
export function activate(context: vscode.ExtensionContext) {
  let config = vscode.workspace.getConfiguration("codex");
  // Add configuration
  let disposables: vscode.Disposable[] = [];
  disposables = registerExtensionCommands(getConfig(config));
  context.subscriptions.push(...disposables);
  // Listen for configuration changes and reload extension commands
  const configWatcher = vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("codex")) {
      config = vscode.workspace.getConfiguration("codex");
      disposables.forEach((disposable) => disposable.dispose());
      disposables = registerExtensionCommands(getConfig(config));
      context.subscriptions.push(...disposables);
    }
  });
  context.subscriptions.push(configWatcher);
}
